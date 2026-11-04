"use client";

import { motion, AnimatePresence } from "framer-motion";
import { pusherClient } from "@/lib/pusher";
import { BottomNav } from "@/components/layout/bottom-nav";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Twitter,
  Facebook,
  LogOut,
  Plus,
  Minus,
  Check,
  Store,
  Sparkles,
  Gift,
  Truck,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthModals } from "@/components/auth/auth-modals";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AgentDashboard } from "@/components/agent/agent-dashboard";
import { MerchantDashboard } from "@/components/merchant/merchant-dashboard";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useSearchParams, useRouter } from "next/navigation";
import { RoleSelector } from "@/components/demo/role-selector";

// Types
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
  description?: string;
  descriptionAr?: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    nameAr: string;
  };
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  image?: string;
  _count?: { products: number };
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

// تم تغيير اسم الدالة من export default إلى دالة عادية
function HomeContent() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"dashboard" | "store">("dashboard");
  const [showRoleSelector, setShowRoleSelector] = useState<boolean | null>(null);

  // Products and categories state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [heroBanners, setHeroBanners] = useState<any[]>([]);
  const [promoAds, setPromoAds] = useState<any[]>([]);

  // Cart and Wishlist
  const {
    state: cartState,
    addItem: addToCart,
    isInCart,
    getItemQuantity,
    updateQuantity,
    clearCart,
  } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Search params and router for OAuth callback
  const searchParams = useSearchParams();
  const router = useRouter();

  // Hero slides
  const heroSlides = [
    {
      title: "اكتشف عالم الأناقة",
      subtitle: "زينة", // صورتك الثابتة
      description: "وجهتك الأولى للعطور والمكياج والأكسسوارات الفاخرة",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200",
      cta: "تسوق الآن",
      link: "/products",
    },
    ...heroBanners.map((banner) => ({
      title: banner.titleAr || "", // العنوان الرئيسي
      subtitle: banner.subtitleAr || "زينة", // العنوان الفرعي الجديد
      description: banner.descriptionAr || "", // الوصف
      image: banner.image,
      cta: banner.ctaAr || "اكتشف العرض", // نص الزر الجديد
      link: banner.link || "/products",
    })),
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Handle Google OAuth callback
  useEffect(() => {
    const auth = searchParams.get("auth");
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const userName = searchParams.get("userName");
    const userEmail = searchParams.get("userEmail");
    const userRole = searchParams.get("userRole");
    const errorMessage = searchParams.get("message");

    // Handle OAuth error
    if (auth === "error" && errorMessage) {
      toast({
        title: "خطأ",
        description: decodeURIComponent(errorMessage),
        variant: "destructive",
      });
      router.replace("/");
      return;
    }

    // Handle OAuth success
    if (
      auth === "success" &&
      token &&
      userId &&
      userName &&
      userEmail &&
      userRole
    ) {
      const userData: UserData = {
        id: userId,
        name: decodeURIComponent(userName),
        email: userEmail,
        phone: "",
        role: userRole,
        isVerified: true,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      setUser(userData);

      toast({
        title: "مرحباً بك",
        description: `تم تسجيل الدخول بنجاح - ${userData.name}`,
      });

      router.replace("/");
    }
  }, [searchParams, router]);

  useEffect(() => {
    // Check for demo session first
    const demoUser = localStorage.getItem("demo_user");
    const demoToken = localStorage.getItem("demo_token");
    const demoSessionId = localStorage.getItem("demo_session_id");

    if (demoUser && demoToken && demoSessionId) {
      try {
        const parsedUser = JSON.parse(demoUser);
        setUser({
          id: parsedUser.id,
          name: parsedUser.name,
          email: parsedUser.email,
          phone: parsedUser.phone || "",
          role: parsedUser.role,
          isVerified: true,
        });
        // Keep the generic token key and cookie in sync for API calls.
        localStorage.setItem("token", demoToken);
        document.cookie = `token=${encodeURIComponent(demoToken)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        setShowRoleSelector(false);
        setIsLoading(false);
        return;
      } catch {
        // Invalid demo data, fall through to role selector
      }
    }

    // Check for regular user
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const timeout = setTimeout(() => {
        setUser(JSON.parse(savedUser));
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(timeout);
    }

    // No session found, show role selector
    const timeout = setTimeout(() => {
      setShowRoleSelector(true);
      setIsLoading(false);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);
  // ✅ رادار التقاط أمر فتح لوحة التحكم من شريط الجوال السفلي (محدث وذكي)
  useEffect(() => {
    if (searchParams.get("view") === "dashboard") {
      setViewMode("dashboard");

      // تنظيف الرابط بعد فتح اللوحة لكي لا يعلق المستخدم
      if (typeof window !== "undefined") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("view");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }
  }, [searchParams]); // 👈 السر كله هنا! أخبرنا الرادار أن يراقب الـ searchParams دائماً
  // Fetch featured products, categories, banners, and ads
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingProducts(true);
      try {
        const productsRes = await fetch("/api/products?isFeatured=true");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        const categoriesRes = await fetch("/api/categories");
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }

        // 👈 إضافة جلب البنرات هنا
        const bannersRes = await fetch("/api/banners");
        if (bannersRes.ok) {
          const bannersData = await bannersRes.json();
          setHeroBanners(bannersData.banners || []);
        }

        // 👈 إضافة جلب الإعلانات الترويجية هنا
        const adsRes = await fetch("/api/advertisements");
        if (adsRes.ok) {
          const adsData = await adsRes.json();
          setPromoAds(adsData.advertisements || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchData();
  }, []);
  // ⚡ التحديث اللحظي للواجهة الرئيسية (للزوار والمستخدمين)
  useEffect(() => {
    if (!pusherClient) return;

    // الاشتراك في القناة العامة للمتجر
    const channel = pusherClient.subscribe("tarfah-public-channel");

    channel.bind("public-update", async () => {
      // تحديث المنتجات والتصنيفات في الخلفية (بصمت وبدون ظهور شاشة التحميل)
      try {
        const productsRes = await fetch("/api/products?isFeatured=true");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        const categoriesRes = await fetch("/api/categories");
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }

        // تحديث البنرات لحظياً
        const bannersRes = await fetch("/api/banners");
        if (bannersRes.ok) {
          const bannersData = await bannersRes.json();
          setHeroBanners(bannersData.banners || []);
        }

        // تحديث الإعلانات الترويجية لحظياً
        const adsRes = await fetch("/api/advertisements");
        if (adsRes.ok) {
          const adsData = await adsRes.json();
          setPromoAds(adsData.advertisements || []);
        }
      } catch (error) {
        console.error("Error fetching live updates:", error);
      }
    });

    return () => {
      pusherClient?.unsubscribe("tarfah-public-channel");
    };
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
    );
  };

  const handleLogout = async () => {
    // Clear demo session if active
    const demoToken = localStorage.getItem("demo_token");
    const demoSessionId = localStorage.getItem("demo_session_id");
    if (demoToken && demoSessionId) {
      try {
        await fetch("/api/demo/session", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${demoToken}`,
          },
        });
      } catch {
        // Ignore errors during logout cleanup
      }
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("demo_user");
    localStorage.removeItem("demo_token");
    localStorage.removeItem("demo_session_id");
    document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
    setUser(null);
    setViewMode("dashboard");
    setShowRoleSelector(null);
    window.location.reload();
  };

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setIsAuthOpen(true);
  };

  const openWhatsApp = (message?: string) => {
    const url = message
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, "_blank");
  };

  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto mb-6"
          >
            <Sparkles className="w-full h-full text-[#C9A962]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#8B7355] mb-2">زينة</h2>
          <p className="text-[#A69B8D]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show role selector if no session exists
  if (showRoleSelector === true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RoleSelector onRoleSelected={(role) => {
          setShowRoleSelector(false);
          // Reload to pick up the new demo session from localStorage
          window.location.reload();
        }} />
      </div>
    );
  }

  // For logged in users - show dashboard or store based on viewMode
  if (user && viewMode === "dashboard") {
    if (user.role === "ADMIN") {
      return (
        <AdminDashboard
          user={user}
          onLogout={handleLogout}
          onViewStore={() => setViewMode("store")}
        />
      );
    }
    if (user.role === "AGENT") {
      return (
        <AgentDashboard
          user={user}
          onLogout={handleLogout}
          onViewStore={() => setViewMode("store")}
        />
      );
    }
    if (user.role === "MERCHANT") {
      return (
        <MerchantDashboard
          user={user}
          onLogout={handleLogout}
          onViewStore={() => setViewMode("store")}
        />
      );
    }
    if (user.role === "CUSTOMER") {
      return (
        <>
          <CustomerDashboard
            user={user}
            onLogout={handleLogout}
            onViewStore={() => setViewMode("store")}
          />
          <ChatWidget
            userId={user.id}
            userName={user.name}
            userRole={user.role}
          />
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
        onViewDashboard={() => setViewMode("dashboard")}
        onViewStore={() => setViewMode("store")}
        viewMode={viewMode}
      />

      {/* Auth Modals */}
      <AuthModals
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultTab={authTab}
      />

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.cart.items}
        userId={user?.id || ""}
        onSuccess={(orderId) => {
          setLastOrderId(orderId);
          clearCart();
        }}
      />

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative h-[90vh] md:h-screen overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${heroSlides[currentSlide].image})`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
              </div>

              <div className="relative h-full flex items-center justify-center text-center text-white px-4">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="max-w-4xl"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="inline-block mb-4"
                  >
                    <Sparkles className="h-8 w-8 text-[#C9A962]" />
                  </motion.div>

                  <motion.p
                    className="text-[#C9A962] text-xl md:text-3xl mb-3 font-light tracking-widest"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {heroSlides[currentSlide].subtitle}
                  </motion.p>

                  <motion.h1
                    className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    {heroSlides[currentSlide].title}
                  </motion.h1>

                  <motion.p
                    className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                  >
                    {heroSlides[currentSlide].description}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                  >
                    <Link href={heroSlides[currentSlide].link || "/products"}>
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white px-10 py-7 text-lg rounded-full transition-all duration-300 group hover-neon-effect"
                      >
                        {heroSlides[currentSlide].cta}
                        <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-[#8B7355] px-8 py-7 text-lg rounded-full transition-all duration-300"
                      onClick={() => openWhatsApp()}
                    >
                      <MessageCircle className="h-5 w-5 ml-2" />
                      تواصل معنا
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide Navigation */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === currentSlide
                    ? "bg-[#C9A962] w-12"
                    : "bg-white/30 hover:bg-white/50 w-2"
                }`}
              />
            ))}
          </div>

          {/* Arrow Navigation */}
          <button
            onClick={prevSlide}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-[#C9A962]/80 backdrop-blur-sm p-4 rounded-full text-white transition-all duration-300 group"
          >
            <ChevronRight className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-[#C9A962]/80 backdrop-blur-sm p-4 rounded-full text-white transition-all duration-300 group"
          >
            <ChevronLeft className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50"
          >
            <ChevronLeft className="h-6 w-6 rotate-90" />
          </motion.div>
        </section>
        {/* Promotional Ads Section (الإعلانات الترويجية الديناميكية) */}
        {promoAds.length > 0 && (
          <section className="py-12 bg-white overflow-hidden">
            <div className="container mx-auto px-4">
              <div className="flex overflow-x-auto pb-6 gap-4 md:gap-6 snap-x custom-scrollbar">
                {promoAds.map((ad, index) => (
                  <motion.div
                    key={ad.id}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="min-w-[85vw] md:min-w-[400px] flex-shrink-0 snap-center cursor-pointer group"
                    onClick={() => ad.link && router.push(ad.link)}
                  >
                    <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl md:rounded-3xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-500 border border-gray-100">
                      <img
                        src={ad.image}
                        alt={ad.titleAr}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      {/* الطبقة الظليلة */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-90" />

                      {/* 💰 السعر: يظهر فوق على الزاوية */}
                      {ad.price && (
                        <div className="absolute top-4 right-4 bg-[var(--gold)] text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg z-10">
                          {ad.price.toLocaleString()} ر.ي
                        </div>
                      )}

                      {/* نصوص الإعلان والزر */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">
                          {ad.titleAr}
                        </h3>
                        {ad.descriptionAr && (
                          <p className="text-sm md:text-lg text-white/80 line-clamp-1">
                            {ad.descriptionAr}
                          </p>
                        )}

                        {/* الزر الذكي */}
                        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-[var(--gold)] opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {ad.ctaAr || "اكتشف العرض"}{" "}
                          <ArrowLeft className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
        {/* Categories Section */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
                استكشف
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
                تصفح الفئات
              </h2>
              <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
                اكتشف مجموعتنا المتنوعة من المنتجات الفاخرة المختارة بعناية
              </p>
            </motion.div>

            {categories.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
              >
                {categories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.id}`}
                  >
                    <motion.div
                      variants={fadeInUp}
                      whileHover={{ y: -10, scale: 1.02 }}
                      className="group relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-shadow duration-500"
                    >
                      <img
                        src={
                          category.image ||
                          `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400`
                        }
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#3D3021]/90 via-[#3D3021]/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="text-xl md:text-2xl font-bold mb-1">
                          {category.nameAr || category.name}
                        </h3>
                        <p className="text-white/70 text-sm flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {category._count?.products || 0} منتج
                        </p>
                      </div>
                      <div className="absolute inset-0 border-2 border-[#C9A962] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    </motion.div>
                  </Link>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#8B7355]">لا توجد فئات حالياً</p>
              </div>
            )}
          </div>
        </section>

        {/* Products Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-[#FAF7F2] to-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
                مميزة
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
                المنتجات المميزة
              </h2>
              <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
                اكتشف أبرز منتجاتنا المختارة بعناية فائقة
              </p>
            </motion.div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden border-0 shadow-lg">
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
                    <CardContent className="p-4 space-y-3">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="h-16 w-16 mx-auto text-[#C9A962]/50 mb-4" />
                <p className="text-[#8B7355] text-lg">
                  لا توجد منتجات مميزة حالياً
                </p>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
              >
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    variants={fadeInUp}
                    whileHover={{ y: -10 }}
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
                          {product.originalPrice &&
                            product.originalPrice > product.price && (
                              <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 px-3 py-1 rounded-full">
                                -
                                {Math.round(
                                  (1 - product.price / product.originalPrice) *
                                    100,
                                )}
                                %
                              </Badge>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-full hover-neon-effect"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(
                                  `استفسار عن منتج: ${product.nameAr}`,
                                );
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
                                toast({
                                  title: isInWishlist(product.id)
                                    ? "تمت الإزالة"
                                    : "تمت الإضافة",
                                  description: isInWishlist(product.id)
                                    ? "تم إزالة المنتج من المفضلة"
                                    : "تم إضافة المنتج للمفضلة",
                                });
                              }}
                            >
                              <Heart
                                className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-rose-500 text-rose-500" : ""}`}
                              />
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
                          {product.originalPrice &&
                            product.originalPrice > product.price && (
                              <span className="text-sm text-[#A69B8D] line-through">
                                {product.originalPrice.toLocaleString()}
                              </span>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            <div className="text-center mt-16">
              <Link href="/products">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-[#C9A962] text-[#8B7355] hover:bg-[#C9A962] hover:text-white px-12 py-7 text-lg rounded-full transition-all duration-300 group"
                >
                  عرض جميع المنتجات
                  <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-[#3D3021] to-[#2A2318] text-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
                لماذا نحن
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                لماذا زينة؟
              </h2>
              <p className="text-white/60 max-w-xl mx-auto text-lg">
                نقدم لكِ تجربة تسوق فريدة ومميزة
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Sparkles,
                  title: "منتجات أصلية 100%",
                  description: "جميع منتجاتنا أصلية مع ضمان الجودة والأصالة",
                },
                {
                  icon: Truck,
                  title: "توصيل لجميع المحافظات",
                  description:
                    "توصيل سريع وآمن لجميع محافظات الجمهورية اليمنية",
                },
                {
                  icon: Shield,
                  title: "دفع آمن وموثوق",
                  description: "طرق دفع متعددة وآمنة تناسب الجميع",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center p-10 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#C9A962]/50 transition-all duration-300 group"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-[#C9A962] via-[#B8956E] to-[#C9A962]">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Gift className="h-12 w-12 text-white mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                انضم إلى عائلة زينة
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
                سجل الآن واحصلي على خصم على أول طلب لك
              </p>
              <Button
                size="lg"
                className="bg-white text-[#8B7355] hover:bg-[#FAF7F2] px-12 py-7 text-lg rounded-full shadow-xl transition-all duration-300"
                onClick={() => {
                  setAuthTab("register");
                  setIsAuthOpen(true);
                }}
              >
                إنشاء حساب جديد
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Chat Widget for everyone (Guest or User) */}
      <ChatWidget
        userId={user?.id || ""}
        userName={user?.name || "زائر"}
        userRole={user?.role || "GUEST"}
      />
      <BottomNav
        user={user}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => {
          setAuthTab("login");
          setIsAuthOpen(true);
        }}
      />
    </div>
  );
}

// هذا هو المكون الذي يتم تصديره بشكل افتراضي، ويقوم بتغليف المحتوى بـ Suspense
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#C9A962] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8B7355]">جاري التحميل...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
