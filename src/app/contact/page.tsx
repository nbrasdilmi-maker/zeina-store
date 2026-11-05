"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, MessageCircle, Send, Instagram, Facebook } from "lucide-react";
import { TikTokIcon } from "@/components/shared/tiktok-icon";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthModals } from "@/components/auth/auth-modals";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { toast } from "@/hooks/use-toast";

const WHATSAPP_NUMBER = "967780655615";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

export default function ContactPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('store');
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const message = `مرحباً، أنا ${formData.name}
رقم الهاتف: ${formData.phone}
البريد: ${formData.email || "غير محدد"}

${formData.message}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    toast({ title: "تم الإرسال", description: "سيتم التواصل معك قريباً" });
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
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
      <main className="flex-1 pt-20 md:pt-24 pb-8">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">تواصل معنا</h1>
            <p className="text-xl text-[var(--muted-foreground)]">
              نحن هنا لمساعدتك! تواصل معنا بأي طريقة تناسبك
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <CardContent className="p-0 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold">واتساب</p>
                      <Button variant="link" className="p-0 h-auto" onClick={openWhatsApp}>
                        +967 780 655 615
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold">هاتف</p>
                      <p className="text-gray-600">+967 780 655 615</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold">البريد الإلكتروني</p>
                      <p className="text-gray-600">zeinabeautyco@gmail.com</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-[var(--gold-dark)]" />
                    </div>
                    <div>
                      <p className="font-bold">العنوان</p>
                      <p className="text-gray-600">صنعاء، اليمن</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="font-bold mb-3">تابعنا على</p>
                    <div className="flex gap-3">
                      <a
                        href="https://www.instagram.com/zeinabeautyco"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                        aria-label="تابعنا على انستغرام"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                      <a
                        href="https://www.tiktok.com/@zeinabeautyco"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:scale-110 transition-transform"
                        aria-label="تابعنا على تيك توك"
                      >
                        <TikTokIcon className="h-5 w-5" />
                      </a>
                      <a
                        href="https://www.facebook.com/zeinabeautyco"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:scale-110 transition-transform"
                        aria-label="تابعنا على فيسبوك"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6">
                <CardContent className="p-0">
                  <h2 className="text-xl font-bold mb-4">أرسل رسالة</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>الاسم *</Label>
                      <Input
                        placeholder="اسمك الكامل"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>رقم الهاتف *</Label>
                      <Input
                        placeholder="+967XXXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label>البريد الإلكتروني (اختياري)</Label>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label>الرسالة *</Label>
                      <Textarea
                        placeholder="اكتب رسالتك هنا..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        rows={4}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <Send className="h-4 w-4 ml-2" />
                      إرسال عبر واتساب
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
