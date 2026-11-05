"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Heart,
  Star,
  Plus,
  Minus,
  Check,
  MessageCircle,
  Search,
  Sparkles,
  Filter,
  Grid,
  LayoutGrid,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthModals } from "@/components/auth/auth-modals";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AgentDashboard } from "@/components/agent/agent-dashboard";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { useWishlist } from "@/contexts/wishlist-context";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  categoryId?: string;
  category?: { nameAr: string };
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
}

// WhatsApp number
const WHATSAPP_NUMBER = "967780655615";

export default function ProductsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('store');

  const { state: cartState, addItem: addToCart, isInCart, getItemQuantity, updateQuantity, clearCart } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setViewMode('dashboard');
    window.location.reload();
  };

  const openWhatsApp = (message?: string) => {
    const url = message
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, '_blank');
  };

  // Filter products
  let filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
    const matchesSearch = product.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort products
  if (sortBy === "price-low") {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-high") {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  } else if (sortBy === "name") {
    filteredProducts = [...filteredProducts].sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
  }

  // Show dashboards for logged users
  if (user && viewMode === 'dashboard') {
    if (user.role === "ADMIN") {
      return <AdminDashboard user={user} onLogout={handleLogout} onViewStore={() => setViewMode('store')} />;
    }
    if (user.role === "AGENT") {
      return <AgentDashboard user={user} onLogout={handleLogout} onViewStore={() => setViewMode('store')} />;
    }
    if (user.role === "CUSTOMER") {
      return (
        <>
          <CustomerDashboard user={user} onLogout={handleLogout} onViewStore={() => setViewMode('store')} />
          <ChatWidget userId={user.id} userName={user.name} userRole={user.role} />
        </>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
      {/* Navbar */}
      <Navbar
        user={user}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onViewDashboard={() => setViewMode('dashboard')}
        onViewStore={() => setViewMode('store')}
        viewMode={viewMode}
      />

      {/* Auth Modals */}
      <AuthModals isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} defaultTab="login" />

      {/* Cart Panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        user={user}
        onCheckout={() => {
          setIsCartOpen(false);
          if (!user && !isGuestCheckoutEnabled()) {
            setIsAuthOpen(true);
            return;
          }
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.cart.items}
        userId={user?.id || ""}
        onSuccess={() => {
          clearCart();
        }}
      />


      {/* Main Content */}
      <main className="flex-1 pt-24 md:pt-28 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
              <Sparkles className="h-4 w-4 inline ml-2" />
              تسوق الآن
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
              جميع المنتجات
            </h1>
            <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
              اكتشف مجموعتنا المتنوعة من المنتجات الفاخرة المختارة بعناية
            </p>
          </motion.div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#E8E0D8] p-6 mb-8">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#C9A962]" />
                  <Input
                    placeholder="ابحث عن منتجات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-12 h-12 rounded-xl border-[#E8E0D8] focus:border-[#C9A962] bg-[#FAF7F2]"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px] h-12 rounded-xl border-[#E8E0D8] bg-[#FAF7F2]">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-12 rounded-xl border-[#E8E0D8] bg-[#FAF7F2]">
                  <SelectValue placeholder="الترتيب" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="price-low">السعر: من الأقل</SelectItem>
                  <SelectItem value="price-high">السعر: من الأعلى</SelectItem>
                  <SelectItem value="name">الاسم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-12 w-12 text-[#C9A962]" />
              </motion.div>
              <p className="text-[#8B7355] mt-4">جاري التحميل...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-[#C9A962]" />
              </div>
              <h3 className="text-xl font-bold text-[#3D3021] mb-2">لا توجد منتجات</h3>
              <p className="text-[#8B7355] mb-6">جرب تغيير الفلاتر أو البحث بكلمات أخرى</p>
              <Button
                className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-full px-8"
                onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
              >
                إعادة ضبط الفلاتر
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[#8B7355]">
                  عرض <span className="font-bold text-[#3D3021]">{filteredProducts.length}</span> منتج
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white rounded-2xl">
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={product.mainImage}
                          alt={product.nameAr}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          {product.isFeatured && (
                            <Badge className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white border-0 px-3 py-1 rounded-full">
                              <Star className="h-3 w-3 ml-1" />
                              مميز
                            </Badge>
                          )}
                          {product.originalPrice && product.originalPrice > product.price && (
                            <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 px-3 py-1 rounded-full">
                              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                            </Badge>
                          )}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(`استفسار عن منتج: ${product.nameAr}`);
                              }}
                            >
                              <MessageCircle className="h-4 w-4 ml-1" />
                              استفسار
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="bg-white/90 hover:bg-white rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWishlist({
                                  productId: product.id,
                                  name: product.name,
                                  nameAr: product.nameAr,
                                  price: product.price,
                                  originalPrice: product.originalPrice,
                                  image: product.mainImage,
                                });
                              }}
                            >
                              <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <p className="text-xs text-[#C9A962] font-medium mb-2 uppercase tracking-wider">
                          {product.category?.nameAr || "بدون تصنيف"}
                        </p>
                        <h3 className="font-semibold text-[#3D3021] text-base mb-3 line-clamp-2 min-h-[48px]">
                          {product.nameAr}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-[#8B7355]">
                            {product.price.toLocaleString()} ر.ي
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-sm text-[#A69B8D] line-through">
                              {product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
