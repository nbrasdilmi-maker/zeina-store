"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Grid2X2,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { AuthModals } from "@/components/auth/auth-modals";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
  _count?: { products: number };
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
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

// WhatsApp number
const WHATSAPP_NUMBER = "967780655615";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
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
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products"),
        ]);

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

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
        onSuccess={() => clearCart()}
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
              استكشف
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
              التصنيفات
            </h1>
            <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
              تصفح منتجاتنا حسب التصنيف واكتشف ما يناسبك
            </p>
          </motion.div>

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
          ) : (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap justify-center gap-3 mb-12">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  className={`h-12 px-6 rounded-full ${selectedCategory === null ? "bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white" : "border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  الكل
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className={`h-12 px-6 rounded-full ${selectedCategory === category.id ? "bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white" : "border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.nameAr}
                  </Button>
                ))}
              </div>

              {/* Categories Grid */}
              {!selectedCategory && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-12">
                  {categories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -10 }}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white rounded-3xl group">
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={category.image || `https://images.unsplash.com/photo-1541643600914-78b084683601?w=400`}
                            alt={category.nameAr}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#3D3021]/90 via-[#3D3021]/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <h3 className="text-xl md:text-2xl font-bold mb-2">{category.nameAr}</h3>
                            <p className="text-white/70 text-sm flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {category._count?.products || 0} منتج
                            </p>
                          </div>
                          <div className="absolute inset-0 border-4 border-[#C9A962] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Products by Category */}
              {selectedCategory && (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-[#3D3021]">
                        {categories.find((c) => c.id === selectedCategory)?.nameAr || "المنتجات"}
                      </h2>
                      <p className="text-[#8B7355] mt-1">{filteredProducts.length} منتج</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedCategory(null)}
                      className="text-[#8B7355] hover:bg-[#FAF7F2]"
                    >
                      عرض الكل
                    </Button>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl">
                      <Sparkles className="h-12 w-12 text-[#C9A962] mx-auto mb-4" />
                      <p className="text-[#8B7355]">لا توجد منتجات في هذا التصنيف</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {filteredProducts.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ y: -10 }}
                          className="cursor-pointer group"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white rounded-2xl">
                            <div className="relative aspect-square overflow-hidden">
                              <img
                                src={product.mainImage}
                                alt={product.nameAr}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              {product.originalPrice && product.originalPrice > product.price && (
                                <Badge className="absolute top-3 right-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1 rounded-full">
                                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                                </Badge>
                              )}
                              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-full"
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
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
