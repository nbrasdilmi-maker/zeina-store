"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ShoppingCart,
  Trash2,
  Sparkles,
  MessageCircle,
  ArrowRight,
  X,
  Check,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthModals } from "@/components/auth/auth-modals";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { useWishlist } from "@/contexts/wishlist-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

const WHATSAPP_NUMBER = "967780655615";

export default function WishlistPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('store');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const { state: cartState, addItem: addToCart, isInCart, clearCart } = useCart();
  const { state: wishlistState, removeItem, clearWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  const handleAddToCart = async (item: typeof wishlistState.items[0]) => {
    setAddingToCart(item.productId);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addToCart({
      productId: item.productId,
      name: item.name,
      nameAr: item.nameAr,
      price: item.price,
      originalPrice: item.originalPrice,
      image: item.image,
      quantity: 1,
      stock: 100, // Default stock
    });

    toast({
      title: "تمت الإضافة للسلة",
      description: `${item.nameAr} أُضيف لسلة التسوق`,
    });

    setAddingToCart(null);
  };

  const handleRemoveFromWishlist = (productId: string, productName: string) => {
    removeItem(productId);
    toast({
      title: "تمت الإزالة",
      description: `${productName} أُزيل من المفضلة`,
    });
  };

  const openWhatsApp = (message?: string) => {
    const url = message
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Sparkles className="w-full h-full text-[#C9A962]" />
          </motion.div>
          <p className="text-[#8B7355]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
      <Navbar
        user={user}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onViewDashboard={() => setViewMode('dashboard')}
        onViewStore={() => setViewMode('store')}
        viewMode={viewMode}
      />

      <AuthModals isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} defaultTab="login" />

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

      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.cart.items}
        userId={user?.id || ""}
        onSuccess={() => clearCart()}
      />

      <main className="flex-1 pt-28 md:pt-32 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 mb-6">
              <Heart className="h-10 w-10 text-rose-500 fill-rose-500" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
              قائمة الأمنيات
            </h1>
            <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
              {wishlistState.itemCount > 0
                ? `${wishlistState.itemCount} منتج في المفضلة`
                : "لم تضيف أي منتجات للمفضلة بعد"}
            </p>
          </motion.div>

          {wishlistState.itemCount === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <Card className="border-0 shadow-xl bg-white rounded-3xl overflow-hidden">
                <div className="p-12 text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6] flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-12 w-12 text-[#C9A962]/50" />
                  </div>
                  <h3 className="text-xl font-bold text-[#3D3021] mb-2">
                    قائمة الأمنيات فارغة
                  </h3>
                  <p className="text-[#8B7355] mb-6">
                    ابدئ بإضافة المنتجات التي تعجبك لسهولة الوصول إليها لاحقاً
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white gap-2"
                    onClick={() => window.location.href = "/products"}
                  >
                    تصفح المنتجات
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Clear All Button */}
              <div className="flex justify-end mb-6">
                <Button
                  variant="ghost"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-2"
                  onClick={() => {
                    clearWishlist();
                    toast({
                      title: "تم مسح المفضلة",
                      description: "تم إزالة جميع المنتجات من المفضلة",
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  مسح الكل
                </Button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                <AnimatePresence>
                  {wishlistState.items.map((item, index) => (
                    <motion.div
                      key={item.productId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white rounded-2xl overflow-hidden">
                        <div className="relative aspect-square">
                          <img
                            src={item.image}
                            alt={item.nameAr}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          
                          {/* Remove Button */}
                          <button
                            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 hover:bg-rose-50 flex items-center justify-center shadow-md transition-all duration-300 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveFromWishlist(item.productId, item.nameAr)}
                          >
                            <X className="h-4 w-4 text-rose-500" />
                          </button>

                          {/* Quick Actions */}
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full"
                                disabled={addingToCart === item.productId}
                                onClick={() => handleAddToCart(item)}
                              >
                                {addingToCart === item.productId ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Sparkles className="h-4 w-4" />
                                  </motion.div>
                                ) : isInCart(item.productId) ? (
                                  <>
                                    <Check className="h-4 w-4 ml-1" />
                                    في السلة
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="h-4 w-4 ml-1" />
                                    للسلة
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/90 hover:bg-white rounded-full"
                                onClick={() => openWhatsApp(`استفسار عن منتج: ${item.nameAr}`)}
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-[#3D3021] text-sm md:text-base line-clamp-2 min-h-[40px] md:min-h-[48px]">
                            {item.nameAr}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-bold text-[#8B7355]">
                              {item.price.toLocaleString()} ر.ي
                            </span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-sm text-[#A69B8D] line-through">
                                {item.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Continue Shopping */}
              <div className="text-center mt-12">
                <Button
                  variant="outline"
                  className="border-2 border-[#C9A962] text-[#8B7355] hover:bg-[#C9A962] hover:text-white px-8 py-6 rounded-full gap-2"
                  onClick={() => window.location.href = "/products"}
                >
                  تصفح المزيد من المنتجات
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
