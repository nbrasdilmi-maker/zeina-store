"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShoppingCart, Heart, ChevronLeft, Loader2, Plus, Minus, Check, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthModals } from "@/components/auth/auth-modals";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  category?: { nameAr: string };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

const WHATSAPP_NUMBER = "967780655615";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.slug as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products?categoryId=${categoryId}`);
      const data = await response.json();
      setProducts(data.products || []);
      
      // Get category name from first product or from categories
      if (data.products?.length > 0 && data.products[0].category) {
        setCategoryName(data.products[0].category.nameAr);
      } else {
        // Try to fetch category name from categories API
        const catResponse = await fetch("/api/categories");
        const catData = await catResponse.json();
        const cat = catData.categories?.find((c: { id: string }) => c.id === categoryId);
        if (cat) {
          setCategoryName(cat.nameAr);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  const formatPrice = (price: number) => `${price.toLocaleString()} ر.ي`;

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

      {/* Breadcrumb */}
      <main className="flex-1 pt-28 md:pt-32">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-[#8B7355]">
            <Link href="/" className="hover:text-[#C9A962] transition-colors">
              الرئيسية
            </Link>
            <ChevronLeft className="h-4 w-4" />
            <Link href="/categories" className="hover:text-[#C9A962] transition-colors">
              الفئات
            </Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[#C9A962]">{categoryName || "فئة"}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-[#3D3021] mb-2">
              {categoryName || "منتجات الفئة"}
            </h1>
            <p className="text-[#8B7355]">{products.length} منتج</p>
          </motion.div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A962]" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-[#8B7355] mb-4">لا توجد منتجات في هذه الفئة</p>
              <Link href="/products">
                <Button className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white">
                  تصفح جميع المنتجات
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all bg-white rounded-2xl">
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.mainImage}
                        alt={product.nameAr}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {product.isFeatured && (
                          <Badge className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white">
                            مميز
                          </Badge>
                        )}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2 text-[#3D3021]">
                        {product.nameAr}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#8B7355]">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-[#A69B8D] line-through">
                            {formatPrice(product.originalPrice)}
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
      </main>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl">
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-6 p-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF7F2]">
                <img 
                  src={selectedProduct.mainImage} 
                  alt={selectedProduct.nameAr} 
                  className="w-full h-full object-cover" 
                />
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                  <Badge className="absolute top-4 right-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                    خصم {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-[#C9A962] font-medium mb-1">
                    {selectedProduct.category?.nameAr}
                  </p>
                  <h2 className="text-2xl font-bold text-[#3D3021]">{selectedProduct.nameAr}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-[#8B7355]">
                    {formatPrice(selectedProduct.price)}
                  </span>
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                    <span className="text-lg text-[#A69B8D] line-through">
                      {formatPrice(selectedProduct.originalPrice)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${selectedProduct.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={`text-sm ${selectedProduct.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedProduct.stock > 0 ? `متوفر (${selectedProduct.stock} قطعة)` : "غير متوفر"}
                  </span>
                </div>

                {isInCart(selectedProduct.id) && (
                  <div className="flex items-center gap-4 p-4 bg-[#FAF7F2] rounded-xl">
                    <span className="font-medium text-[#3D3021]">الكمية:</span>
                    <div className="flex items-center gap-3 bg-white rounded-full p-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 rounded-full"
                        onClick={() => updateQuantity(selectedProduct.id, getItemQuantity(selectedProduct.id) - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-bold text-lg">{getItemQuantity(selectedProduct.id)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 rounded-full"
                        onClick={() => updateQuantity(selectedProduct.id, getItemQuantity(selectedProduct.id) + 1)}
                        disabled={getItemQuantity(selectedProduct.id) >= selectedProduct.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 mt-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full py-6"
                    disabled={selectedProduct.stock === 0}
                    onClick={() => {
                      if (!isInCart(selectedProduct.id)) {
                        addToCart({
                          productId: selectedProduct.id,
                          name: selectedProduct.name,
                          nameAr: selectedProduct.nameAr,
                          price: selectedProduct.price,
                          originalPrice: selectedProduct.originalPrice,
                          image: selectedProduct.mainImage,
                          quantity: 1,
                          stock: selectedProduct.stock,
                        });
                        toast({ title: "تمت الإضافة", description: "تم إضافة المنتج للسلة" });
                      }
                    }}
                  >
                    {isInCart(selectedProduct.id) ? (
                      <>
                        <Check className="h-5 w-5 ml-2" />
                        في السلة
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5 ml-2" />
                        أضف للسلة
                      </>
                    )}
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className={`flex-1 py-5 rounded-full ${isInWishlist(selectedProduct.id) ? 'border-rose-400 text-rose-500' : 'border-[#C9A962] text-[#8B7355]'}`}
                      onClick={() => {
                        toggleWishlist({
                          productId: selectedProduct.id,
                          name: selectedProduct.name,
                          nameAr: selectedProduct.nameAr,
                          price: selectedProduct.price,
                          originalPrice: selectedProduct.originalPrice,
                          image: selectedProduct.mainImage,
                        });
                        toast({ title: isInWishlist(selectedProduct.id) ? "تمت الإزالة" : "تمت الإضافة" });
                      }}
                    >
                      <Heart className={`h-5 w-5 ml-2 ${isInWishlist(selectedProduct.id) ? 'fill-rose-500' : ''}`} />
                      المفضلة
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 py-5 rounded-full border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                      onClick={() => openWhatsApp(`استفسار عن منتج: ${selectedProduct.nameAr}`)}
                    >
                      <MessageCircle className="h-5 w-5 ml-2" />
                      واتساب
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <Footer />
    </div>
  );
}
