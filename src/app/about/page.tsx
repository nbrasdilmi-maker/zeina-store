"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthModals } from "@/components/auth/auth-modals";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { useCart } from "@/contexts/cart-context";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

export default function AboutPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('store');

  const { state: cartState, clearCart } = useCart();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const timeout = setTimeout(() => {
        setUser(JSON.parse(savedUser));
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setViewMode('dashboard');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
          if (!user) {
            setIsCartOpen(false);
            setIsAuthOpen(true);
          } else {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }
        }}
      />

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.items}
        userId={user?.id || ""}
        onSuccess={() => {
          clearCart();
        }}
      />

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-24 pb-8">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">عن متجر زينة</h1>
            <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
              وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن
            </p>
          </motion.div>

          {/* Story Section */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800"
                alt="قصتنا"
                className="w-full rounded-2xl shadow-lg"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col justify-center"
            >
              <h2 className="text-3xl font-bold mb-4">قصتنا</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                بدأت زينة كحلم بسيط: تقديم منتجات تجميل وعطور فاخرة للمرأة اليمنية بأسعار مناسبة وجودة عالية.
              </p>
              <p className="text-gray-600 leading-relaxed">
                نحن نؤمن بأن كل امرأة تستحق أن تشعر بالجمال والأناقة، ولهذا نسعى دائماً لتوفير أفضل المنتجات من أشهر الماركات العالمية.
              </p>
            </motion.div>
          </div>

          {/* Values Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-8">قيمنا</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-4">✨</div>
                  <h3 className="text-xl font-bold mb-2">الجودة</h3>
                  <p className="text-gray-600">نختار فقط المنتجات الأصلية وعالية الجودة</p>
                </CardContent>
              </Card>
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-4">💜</div>
                  <h3 className="text-xl font-bold mb-2">الثقة</h3>
                  <p className="text-gray-600">نبني علاقات طويلة الأمد مع عملائنا</p>
                </CardContent>
              </Card>
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-4">🌟</div>
                  <h3 className="text-xl font-bold mb-2">التميز</h3>
                  <p className="text-gray-600">نسعى دائماً لتقديم الأفضل</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] rounded-2xl p-8 text-white text-center"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-4xl font-bold">500+</p>
                <p className="text-white/80">عميلة سعيدة</p>
              </div>
              <div>
                <p className="text-4xl font-bold">200+</p>
                <p className="text-white/80">منتج متنوع</p>
              </div>
              <div>
                <p className="text-4xl font-bold">22</p>
                <p className="text-white/80">محافظة نصلها</p>
              </div>
              <div>
                <p className="text-4xl font-bold">24/7</p>
                <p className="text-white/80">دعم متواصل</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
