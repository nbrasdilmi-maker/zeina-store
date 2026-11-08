"use client";

import { motion, AnimatePresence } from "framer-motion";
import { pusherClient } from "@/lib/pusher";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
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
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
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
import {
  clearDemoSession,
  isGuestCheckoutEnabled,
  readAnyUser,
} from "@/lib/demo-client";

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
  inStock?: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    nameAr: string;
    slug?: string;
    parentId?: string | null;
  };
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
  parentId?: string | null;
  productCount?: number;
  _count?: { products: number };
  children?: Category[];
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
const WHATSAPP_NUMBER = "967780655615";

// تم تغيير اسم الدالة من export default إلى دالة عادية
function HomeContent() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"dashboard" | "store">("dashboard");

  // Products and categories state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] =
    useState(false);

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [heroBanners, setHeroBanners] = useState<any[]>([]);
  const [promoAds, setPromoAds] = useState<any[]>([]);

  // تجميع المنتجات حسب القسم الرئيسي
  const groupedProducts = useMemo(() => {
    const parentById = new Map<string, Category>();
    const parentByChildId = new Map<string, Category>();
    for (const parent of categories) {
      parentById.set(parent.id, parent);
      parent.children?.forEach((child) => parentByChildId.set(child.id, parent));
    }
    const groups = new Map<string, { category: Category | null; items: Product[] }>();
    for (const product of products) {
      const categoryId = product.category?.id || product.categoryId;
      const parent =
        (categoryId ? parentByChildId.get(categoryId) : undefined) ||
        (categoryId ? parentById.get(categoryId) : undefined) ||
        null;
      const key = parent?.id || "__other__";
      const entry = groups.get(key) || { category: parent, items: [] };
      entry.items.push(product);
      groups.set(key, entry);
    }
    const ordered = [...groups.values()].filter((g) => g.items.length > 0);
    ordered.sort((a, b) => {
      if (!a.category) return 1;
      if (!b.category) return -1;
      const orderA = categories.findIndex((c) => c.id === a.category?.id);
      const orderB = categories.findIndex((c) => c.id === b.category?.id);
      return orderA - orderB;
    });
    return ordered;
  }, [products, categories]);

  // بنرات إعلانية بين الأقسام (إعلانات حقيقية أو صور فاخرة بديلة)
  const bannerItems = useMemo(() => {
    if (promoAds.length > 0) {
      return promoAds.map((ad) => ({
        id: ad.id,
        image: ad.image,
        titleAr: ad.titleAr || "عروض زينة",
        descriptionAr: ad.descriptionAr || "اكتشفي تشكيلتنا الفاخرة",
        price: ad.price,
        link: ad.link || "/products",
        ctaAr: ad.ctaAr || "اكتشف العرض",
      }));
    }
    return [
      {
        id: "fallback-1",
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600",
        titleAr: "عروض العطور الفاخرة",
        descriptionAr: "تشكيلة مميزة من أرقى العطور العالمية",
        price: null as number | null,
        link: "/products?category=perfumes",
        ctaAr: "تسوّقي الآن",
      },
      {
        id: "fallback-2",
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1600",
        titleAr: "تشكيلة التجميل الجديدة",
        descriptionAr: "كل ما تحتاجينه لإطلالة مثالية",
        price: null as number | null,
        link: "/products?category=makeup",
        ctaAr: "اكتشفي المجموعة",
      },
      {
        id: "fallback-3",
        image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600",
        titleAr: "إكسسوارات تليق بكِ",
        descriptionAr: "قطع أنيقة تضيف لمسة فاخرة لكل إطلالة",
        price: null as number | null,
        link: "/products?category=accessories",
        ctaAr: "تصفحي الأقسام",
      },
    ];
  }, [promoAds]);

  const [bannerIndex, setBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  useEffect(() => {
    if (isBannerPaused || bannerItems.length <= 1) return;
    const timer = setInterval(
      () => setBannerIndex((i) => (i + 1) % bannerItems.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [bannerItems.length, isBannerPaused]);

  // تمرير أفقي لشريط القسم (RTL)
  const stripRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const progressRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollStrip = (groupId: string, direction: 1 | -1) => {
    const el = stripRefsRef.current.get(groupId);
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    // تنقّل فوري موثوق (يعمل حتى مع بطء الحركة) — السحب اللمسي يعمل بسلاسة
    const page = el.clientWidth * 0.9;
    const startNorm = Math.abs(el.scrollLeft);
    const targetNorm = Math.min(max, Math.max(0, startNorm + direction * page));
    const isNegative = el.scrollLeft <= 0;
    el.scrollLeft = isNegative ? -targetNorm : targetNorm;
    // تحديث شريط التقدّم مباشرة (قد لا يصل حدث التمرير دائماً)
    const bar = progressRefsRef.current.get(groupId);
    if (bar) {
      bar.style.width = `${Math.max(8, Math.min(100, (targetNorm / max) * 100))}%`;
    }
  };
  const handleStripScroll = (groupId: string, el: HTMLDivElement) => {
    // تحديث مباشر لشريط التقدم بدون إعادة رسم (حتى لا يتوقف التمرير السلس)
    const bar = progressRefsRef.current.get(groupId);
    if (!bar) return;
    const max = el.scrollWidth - el.clientWidth;
    const ratio = max <= 0 ? 0 : Math.abs(el.scrollLeft) / max;
    bar.style.width = `${Math.max(8, Math.min(100, ratio * 100))}%`;
  };

  const handleAddToCart = (product: Product, event?: React.MouseEvent) => {
    event?.stopPropagation();
    addToCart({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.mainImage,
      quantity: 1,
      stock: product.stock || 20,
    });
    toast({
      title: "تمت الإضافة إلى السلة",
      description: `تمت إضافة «${product.nameAr}» إلى سلة التسوق`,
    });
  };

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

      // A regular OAuth login replaces any active demo identity.
      clearDemoSession();

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
    // The floating role switcher and guest checkout both use the same
    // storage contract. `readAnyUser` also mirrors demo tokens for APIs.
    const timeout = setTimeout(() => {
      const stored = readAnyUser();
      if (stored) {
        setUser({
          id: stored.id,
          name: stored.name,
          email: stored.email,
          phone: stored.phone || "",
          role: stored.role,
          isVerified: stored.isVerified !== false,
        });
        // Guests keep shopping; demo roles open their dashboard.
        if (stored.isGuest) setViewMode("store");
      }
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

  // يفتح نافذة تسجيل الدخول عند الضغط على "حسابي" في القائمة السفلية للزائر
  useEffect(() => {
    if (searchParams.get("auth") !== "login") return;

    setAuthTab("login");
    setIsAuthOpen(true);

    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("auth");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams]);

  // Fetch all products (grouped by category), categories, banners, and ads
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingProducts(true);
      try {
        // جلب جميع المنتجات لعرضها مصنّفة حسب الأقسام
        const productsRes = await fetch("/api/products");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        const categoriesRes = await fetch("/api/categories");
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(
            categoriesData.tree?.length
              ? categoriesData.tree
              : (categoriesData.categories || []).filter(
                  (category: Category) => !category.parentId,
                ),
          );
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
        const productsRes = await fetch("/api/products");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        const categoriesRes = await fetch("/api/categories");
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(
            categoriesData.tree?.length
              ? categoriesData.tree
              : (categoriesData.categories || []).filter(
                  (category: Category) => !category.parentId,
                ),
          );
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

  const handleLogout = () => {
    // Local-only sign out: server demo rows expire on their own.
    clearDemoSession();
    setUser(null);
    setViewMode("store");
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
        onSessionReady={(guestUser) => {
          setUser(guestUser);
          setViewMode("store");
        }}
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-4"
                  >
                    <img
                      src="/zeina-logo-footer.png"
                      alt="زينة"
                      loading="eager"
                      fetchPriority="high"
                      className="mx-auto h-auto w-48 sm:w-64 md:w-80 lg:w-96 object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
                    />
                  </motion.div>

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
        <section className="py-16 md:py-28 bg-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10 md:mb-16"
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

              {/* زر الأقسام + قائمة منسدلة احترافية */}
              <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isCategoriesDropdownOpen}
                  onClick={() =>
                    setIsCategoriesDropdownOpen((open) => !open)
                  }
                  className="group inline-flex items-center gap-2.5 rounded-full border border-[#C9A962]/50 bg-gradient-to-l from-[#FAF7F2] to-white px-5 py-3 shadow-sm transition-all hover:border-[#C9A962] hover:shadow-md"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white">
                    <LayoutGrid className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-bold text-[#3D3021]">
                    الأقسام
                  </span>
                  <span className="rounded-full bg-[#C9A962]/10 px-2 py-0.5 text-[11px] font-bold text-[#8B7355]">
                    {categories.length || 15}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#C9A962] transition-transform ${
                      isCategoriesDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new Event("zeina:open-categories"))
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-[#3D3021]/15 bg-white px-5 py-3 text-sm font-bold text-[#3D3021] shadow-sm transition-all hover:border-[#C9A962] hover:shadow-md md:hidden"
                >
                  <LayoutGrid className="h-4 w-4 text-[#C9A962]" />
                  تسوقي حسب الأقسام
                </button>

                <Link
                  href="/categories"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-[#8B7355] transition-colors hover:text-[#3D3021]"
                >
                  جميع الأقسام
                  <ChevronLeft className="h-4 w-4 text-[#C9A962]" />
                </Link>

                <AnimatePresence>
                  {isCategoriesDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsCategoriesDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        role="menu"
                        aria-label="الأقسام"
                        className="absolute right-1/2 top-full z-20 mt-3 w-[min(92vw,46rem)] translate-x-1/2 overflow-hidden rounded-3xl border border-[#EDE5DA] bg-[#FFFDF9] text-right shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-[#F1E9DC] bg-gradient-to-l from-[#FAF7F2] to-white px-5 py-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#C9A962]">
                              زينة
                            </p>
                            <p className="text-base font-bold text-[#3D3021]">
                              تسوقي حسب الأقسام
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#8B7355] shadow-sm">
                            {categories.length} قسماً
                          </span>
                        </div>

                        <div className="max-h-[55vh] overflow-y-auto p-4">
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {categories.map((category) => {
                              const productCount =
                                category.productCount ??
                                category._count?.products ??
                                0;
                              return (
                                <Link
                                  key={category.id}
                                  href={`/products?category=${category.slug}`}
                                  onClick={() =>
                                    setIsCategoriesDropdownOpen(false)
                                  }
                                  className="group flex items-center gap-3 rounded-2xl border border-[#EDE5DA] bg-white p-3 shadow-sm transition-all hover:border-[#C9A962]/60 hover:shadow-md"
                                >
                                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-[#C9A962]/25">
                                    <img
                                      src={
                                        category.image ||
                                        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"
                                      }
                                      alt={category.nameAr || category.name}
                                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-bold text-[#3D3021]">
                                      {category.nameAr || category.name}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-[#A69B8D]">
                                      {productCount} منتج ·{" "}
                                      {category.children?.length || 0} فئات
                                    </span>
                                  </span>
                                  <ChevronLeft className="h-4 w-4 shrink-0 text-[#C9A962] opacity-50 transition-all group-hover:-translate-x-0.5 group-hover:opacity-100" />
                                </Link>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F1E9DC] bg-white px-5 py-4">
                          <span className="text-xs text-[#A69B8D]">
                            {categories.length} قسماً رئيسياً وفئات فرعية
                            مختارة بعناية
                          </span>
                          <div className="flex items-center gap-3">
                            <Link
                              href="/categories"
                              onClick={() =>
                                setIsCategoriesDropdownOpen(false)
                              }
                              className="text-sm font-bold text-[#8B7355] hover:text-[#3D3021]"
                            >
                              كل الأقسام
                            </Link>
                            <Link
                              href="/products"
                              onClick={() =>
                                setIsCategoriesDropdownOpen(false)
                              }
                              className="rounded-full bg-gradient-to-l from-[#C9A962] to-[#B8956E] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-[#B8956E] hover:to-[#9A7B4F]"
                            >
                              تصفح جميع المنتجات
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {categories.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5"
              >
                {categories.map((category) => {
                  const productCount =
                    category.productCount ?? category._count?.products ?? 0;
                  const childCount = category.children?.length || 0;

                  return (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      className="block h-full"
                    >
                      <motion.div
                        variants={fadeInUp}
                        whileHover={{ y: -4 }}
                        className="group relative flex h-full items-center gap-3 overflow-hidden rounded-2xl border border-[#EDE5DA] bg-white p-3 shadow-sm transition-all duration-300 hover:border-[#C9A962]/60 hover:shadow-xl md:gap-4 md:p-4"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#FAF7F2] ring-1 ring-[#C9A962]/25 md:h-14 md:w-14 md:rounded-2xl">
                          <img
                            src={
                              category.image ||
                              `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200`
                            }
                            alt={category.nameAr || category.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#3D3021]/25 to-transparent" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-[#3D3021] transition-colors group-hover:text-[#8B7355] md:text-base">
                            {category.nameAr || category.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#A69B8D] md:text-[11px]">
                            <Sparkles className="h-3 w-3 shrink-0 text-[#C9A962]" />
                            <span>{productCount} منتج</span>
                            {childCount > 0 && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-[#D8CFC3]" />
                                <span>{childCount} فئات</span>
                              </>
                            )}
                          </div>
                        </div>

                        <ChevronLeft className="h-4 w-4 shrink-0 text-[#C9A962] opacity-40 transition-all duration-300 group-hover:-translate-x-0.5 group-hover:opacity-100" />
                      </motion.div>
                    </Link>
                  );
                })}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#8B7355]">لا توجد فئات حالياً</p>
              </div>
            )}
          </div>
        </section>

        {/* Products Section - grouped by category */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-[#FAF7F2] to-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 md:mb-16"
            >
              <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
                تشكيلتنا
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
                المنتجات حسب الأقسام
              </h2>
              <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
                كل قسم في مكان واحد — منتجات العطور في قسمها، ومنتجات التجميل
                في قسمها، وكل فئة مرتبة بعناية
              </p>
            </motion.div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card
                    key={i}
                    className="overflow-hidden border-0 rounded-2xl shadow-lg"
                  >
                    <div className="aspect-square animate-pulse bg-gradient-to-br from-gray-100 to-gray-200" />
                    <CardContent className="space-y-3 p-4">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center">
                <Sparkles className="mx-auto mb-4 h-16 w-16 text-[#C9A962]/50" />
                <p className="text-lg text-[#8B7355]">
                  لا توجد منتجات مميزة حالياً
                </p>
              </div>
            ) : groupedProducts.length === 0 ? (
              <div className="py-20 text-center">
                <Sparkles className="mx-auto mb-4 h-16 w-16 text-[#C9A962]/50" />
                <p className="text-lg text-[#8B7355]">
                  جاري تحميل الأقسام والمنتجات...
                </p>
              </div>
            ) : (
              <div className="space-y-10 md:space-y-14">
                {groupedProducts.map((group, groupIndex) => {
                  const groupCategory = group.category;
                  const title = groupCategory
                    ? groupCategory.nameAr || groupCategory.name
                    : "تشكيلة مختارة";
                  const groupSlug = groupCategory?.slug || "";
                  const shownProducts = group.items;
                  const groupId = groupCategory?.id || "__other__";
                  const currentBanner =
                    bannerItems[
                      (bannerIndex + groupIndex) % bannerItems.length
                    ];
                  return (
                    <div
                      key={groupCategory?.id || "__other__"}
                      className="space-y-10 md:space-y-14"
                    >
                    <div className="overflow-hidden rounded-[28px] border border-[#EDE5DA] bg-white/60 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1E9DC] bg-gradient-to-l from-[#FAF7F2] to-white px-4 py-4 md:px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F2] ring-1 ring-[#C9A962]/25">
                            {groupCategory?.image ? (
                              <img
                                src={groupCategory.image}
                                alt={title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Sparkles className="h-5 w-5 text-[#C9A962]" />
                            )}
                          </span>
                          <div>
                            <h3 className="text-lg font-bold text-[#3D3021] md:text-xl">
                              {title}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#A69B8D]">
                              {group.items.length} منتج ·{" "}
                              {groupCategory?.children?.length || 0} فئة فرعية
                            </p>
                          </div>
                        </div>
                        {groupSlug ? (
                          <Link
                            href={`/products?category=${groupSlug}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A962] px-4 py-2 text-sm font-bold text-[#8B7355] transition-colors hover:bg-[#C9A962] hover:text-white"
                          >
                            عرض الكل
                            <ChevronLeft className="h-4 w-4" />
                          </Link>
                        ) : (
                          <Link
                            href="/products"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A962] px-4 py-2 text-sm font-bold text-[#8B7355] transition-colors hover:bg-[#C9A962] hover:text-white"
                          >
                            عرض الكل
                            <ChevronLeft className="h-4 w-4" />
                          </Link>
                        )}
                      </div>

                      <div className="relative">
                        <div
                          ref={(el) => {
                            if (el) stripRefsRef.current.set(groupId, el);
                            else stripRefsRef.current.delete(groupId);
                          }}
                          onScroll={(e) =>
                            handleStripScroll(groupId, e.currentTarget)
                          }
                          className="no-scrollbar flex gap-3 overflow-x-auto p-4 sm:gap-4 md:p-6"
                        >
                        {shownProducts.map((product) => (
                          <motion.div
                            key={product.id}
                            variants={fadeInUp}
                            whileHover={{ y: -6 }}
                            className="group w-[calc(50%-6px)] shrink-0 cursor-pointer snap-start sm:w-[calc(33.333%-8.7px)] md:w-[calc(25%-9px)] lg:w-[calc(16.6667%-10px)]"
                            onClick={() =>
                              router.push(`/products/${product.id}`)
                            }
                          >
                            <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-lg transition-all duration-500 hover:shadow-2xl">
                              <div className="relative aspect-square overflow-hidden">
                                <img
                                  src={product.mainImage}
                                  alt={product.nameAr}
                                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute right-3 top-3 flex flex-col gap-2">
                                  {product.isFeatured && (
                                    <Badge className="rounded-full border-0 bg-gradient-to-r from-[#C9A962] to-[#B8956E] px-3 py-1 text-white">
                                      <Star className="ml-1 h-3 w-3" />
                                      مميز
                                    </Badge>
                                  )}
                                  {product.originalPrice &&
                                    product.originalPrice > product.price && (
                                      <Badge className="rounded-full border-0 bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1 text-white">
                                        -
                                        {Math.round(
                                          (1 -
                                            product.price /
                                              product.originalPrice) *
                                            100,
                                        )}
                                        %
                                      </Badge>
                                    )}
                                </div>

                                {/* زر السلة العائم على الصورة */}
                                <button
                                  type="button"
                                  aria-label={`إضافة ${product.nameAr} إلى السلة`}
                                  onClick={(e) => handleAddToCart(product, e)}
                                  className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#3D3021] shadow-lg transition-all hover:scale-110 hover:bg-[#C9A962] hover:text-white"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </button>

                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1 rounded-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white hover-neon-effect"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsApp(
                                          `استفسار عن منتج: ${product.nameAr}`,
                                        );
                                      }}
                                    >
                                      <MessageCircle className="ml-1 h-4 w-4" />
                                      استفسار
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-full bg-white/90 hover:bg-white"
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
                              <CardContent className="p-3.5 md:p-4">
                                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[#C9A962] md:text-xs">
                                  {product.category?.nameAr || title}
                                </p>
                                <h4 className="mb-2 min-h-[40px] line-clamp-2 text-sm font-semibold text-[#3D3021] md:min-h-[48px] md:text-base">
                                  {product.nameAr}
                                </h4>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="whitespace-nowrap text-base font-bold text-[#8B7355] md:text-lg">
                                      {product.price.toLocaleString()} ر.ي
                                    </span>
                                    {product.originalPrice &&
                                      product.originalPrice > product.price && (
                                        <span className="text-xs line-through text-[#A69B8D] md:text-sm">
                                          {product.originalPrice.toLocaleString()}
                                        </span>
                                      )}
                                  </div>
                                  <button
                                    type="button"
                                    aria-label={`إضافة ${product.nameAr} إلى السلة`}
                                    onClick={(e) =>
                                      handleAddToCart(product, e)
                                    }
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white shadow-md transition-all hover:scale-110 hover:shadow-lg"
                                  >
                                    <ShoppingCart className="h-4 w-4" />
                                  </button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                        </div>

                        {/* أسهم التنقل على الكمبيوتر */}
                        {shownProducts.length > 2 && (
                          <>
                            <button
                              type="button"
                              aria-label="السابق"
                              onClick={() => scrollStrip(groupId, -1)}
                              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#3D3021] shadow-lg transition hover:bg-[#C9A962] hover:text-white md:flex"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              aria-label="التالي"
                              onClick={() => scrollStrip(groupId, 1)}
                              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#3D3021] shadow-lg transition hover:bg-[#C9A962] hover:text-white md:flex"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                          </>
                        )}

                        {/* شريط تقدّم ذهبي */}
                        {shownProducts.length > 2 && (
                          <div className="mx-6 mb-4 h-1 rounded-full bg-[#F1E9DC]">
                            <div
                              ref={(el) => {
                                if (el) progressRefsRef.current.set(groupId, el);
                                else progressRefsRef.current.delete(groupId);
                              }}
                              className="h-1 rounded-full bg-gradient-to-l from-[#C9A962] to-[#B8956E] transition-all duration-300"
                              style={{ width: "8%" }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* بانر إعلاني متحرّك بين الأقسام */}
                    {groupIndex < groupedProducts.length - 1 &&
                      currentBanner && (
                        <div
                          className="relative overflow-hidden rounded-[28px] border border-[#EDE5DA] shadow-xl"
                          onMouseEnter={() => setIsBannerPaused(true)}
                          onMouseLeave={() => setIsBannerPaused(false)}
                        >
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={currentBanner.id}
                              initial={{ opacity: 0, scale: 1.04 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.99 }}
                              transition={{ duration: 0.7 }}
                              className="relative aspect-[16/9] cursor-pointer md:aspect-[21/7]"
                              onClick={() =>
                                router.push(currentBanner.link || "/products")
                              }
                            >
                              <img
                                src={currentBanner.image}
                                alt={currentBanner.titleAr}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#3D3021]/90 via-[#3D3021]/30 to-transparent" />
                              {currentBanner.price && (
                                <div className="absolute right-4 top-4 rounded-full bg-[#C9A962] px-3 py-1 text-sm font-bold text-white shadow-lg">
                                  {currentBanner.price.toLocaleString()} ر.ي
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white md:p-8">
                                <div>
                                  <h3 className="text-xl font-bold md:text-3xl">
                                    {currentBanner.titleAr}
                                  </h3>
                                  {currentBanner.descriptionAr && (
                                    <p className="mt-1 text-sm text-white/80 line-clamp-1 md:text-base">
                                      {currentBanner.descriptionAr}
                                    </p>
                                  )}
                                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#C9A962]">
                                    {currentBanner.ctaAr}
                                    <ChevronLeft className="h-4 w-4" />
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {bannerItems.map((item, idx) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      aria-label={`بنر ${idx + 1}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBannerIndex(
                                          (idx - groupIndex + bannerItems.length) %
                                            bannerItems.length,
                                        );
                                      }}
                                      className={`h-2 rounded-full transition-all ${
                                        (bannerIndex + groupIndex) %
                                          bannerItems.length ===
                                        idx
                                          ? "w-8 bg-[#C9A962]"
                                          : "w-2 bg-white/50 hover:bg-white/80"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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

        {/* Features Section - compact */}
        <section className="bg-gradient-to-b from-[#3D3021] to-[#2A2318] py-10 text-white md:py-14">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-7 text-center md:mb-9"
            >
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.3em] text-[#C9A962] md:text-xs">
                لماذا نحن
              </span>
              <h2 className="mb-1.5 text-2xl font-bold md:text-3xl">
                لماذا زينة؟
              </h2>
              <p className="mx-auto max-w-md text-sm text-white/60 md:text-base">
                نقدم لكِ تجربة تسوق فريدة ومميزة
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
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
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.12 }}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm transition-all duration-300 hover:border-[#C9A962]/50 md:p-5"
                >
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] transition-transform duration-300 group-hover:scale-110 md:h-12 md:w-12">
                    <feature.icon className="h-5 w-5 text-white md:h-6 md:w-6" />
                  </div>
                  <h3 className="mb-1 text-base font-bold md:text-lg">
                    {feature.title}
                  </h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-white/60 md:text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - compact */}
        <section className="bg-gradient-to-r from-[#C9A962] via-[#B8956E] to-[#C9A962] py-8 md:py-10">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-right"
            >
              <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 md:h-12 md:w-12">
                  <Gift className="h-5 w-5 text-white md:h-6 md:w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-white md:text-2xl">
                    انضم إلى عائلة زينة
                  </h2>
                  <p className="mt-0.5 text-sm text-white/85 md:text-base">
                    سجل الآن واحصلي على خصم على أول طلب لك
                  </p>
                </div>
              </div>
              <Button
                className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#8B7355] shadow-lg transition-all duration-300 hover:bg-[#FAF7F2] md:px-8 md:py-3 md:text-base"
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
