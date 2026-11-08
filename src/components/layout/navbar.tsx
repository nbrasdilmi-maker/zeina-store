"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "./notification-bell";
import {
  ShoppingCart,
  Heart,
  Menu,
  X,
  User,
  LogOut,
  Store,
  LayoutDashboard,
  Sparkles,
  Bell,
  ChevronDown,
  ChevronLeft,
  LayoutGrid,
  ArrowRight,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { clearDemoSession } from "@/lib/demo-client";

interface NavCategory {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string | null;
  parentId?: string | null;
  productCount?: number;
  children?: NavCategory[];
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface NavbarProps {
  user?: UserData | null;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onOpenWishlist?: () => void;
  onLogout?: () => void;
  onViewStore?: () => void;
  onViewDashboard?: () => void;
  viewMode?: "dashboard" | "store";
}

export function Navbar({
  user,
  onOpenCart,
  onOpenAuth,
  onOpenWishlist,
  onLogout,
  onViewStore,
  onViewDashboard,
  viewMode = "store",
}: NavbarProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [categoriesTree, setCategoriesTree] = useState<NavCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [activeMegaSlug, setActiveMegaSlug] = useState<string>("");
  const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
  const [mobileCategorySlug, setMobileCategorySlug] = useState<string>("");

  const loadCategories = async () => {
    if (categoriesTree.length > 0 || categoriesLoading) return;
    setCategoriesLoading(true);
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        const tree: NavCategory[] = data.tree || [];
        setCategoriesTree(tree);
        setActiveMegaSlug((current) => current || tree[0]?.slug || "");
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const openMegaMenu = () => {
    setIsMegaOpen(true);
    loadCategories();
  };

  const activeMegaCategory =
    categoriesTree.find((category) => category.slug === activeMegaSlug) ||
    categoriesTree[0];

  const mobileCategory = categoriesTree.find(
    (category) => category.slug === mobileCategorySlug,
  );

  const { state } = useCart();
  const { state: wishlistState } = useWishlist();

  const cartItemCount = state?.cart?.itemCount || 0;
  const wishlistItemCount = wishlistState?.itemCount || 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close every menu after navigating, and close the mega menu with Escape.
  useEffect(() => {
    setIsMegaOpen(false);
    setIsMobileMenuOpen(false);
    setIsCategoriesMenuOpen(false);
    setMobileCategorySlug("");
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMegaOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/products", label: "المنتجات" },
    { href: "/categories", label: "الفئات" },
    { href: "/about", label: "عن المتجر" },
    { href: "/contact", label: "تواصل معنا" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleWishlistClick = () => {
    if (onOpenWishlist) {
      onOpenWishlist();
    } else {
      window.location.href = "/wishlist";
    }
  };

  return (
    <header
      onMouseLeave={() => setIsMegaOpen(false)}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/98 backdrop-blur-xl shadow-lg shadow-black/5"
          : "bg-white/90 backdrop-blur-md"
      }`}
    >
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-[#3D3021] via-[#4A3D2E] to-[#3D3021] text-white py-2 text-center text-sm">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3 text-[#C9A962]" />
          <span className="text-white/90 font-medium tracking-wide">
            ✨ زينة .. وجهتكِ الأولى للأناقة والجمال ✨
          </span>
          <Sparkles className="h-3 w-3 text-[#C9A962]" />
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile Menu Button */}
          <Sheet
            open={isMobileMenuOpen}
            onOpenChange={(open) => {
              setIsMobileMenuOpen(open);
              if (open) loadCategories();
            }}
          >
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-[#FAF7F2] shrink-0"
              >
                <Menu className="h-6 w-6 text-[#3D3021]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white border-l-0 p-0">
              <div className="flex flex-col h-full">
                {/* رأس القائمة */}
                <div className="flex items-center justify-between p-4 pb-2 border-b border-[#FAF7F2]">
                  <img
                    src="/zeina-logo-header.png"
                    alt="زينة"
                    className="h-10 w-auto object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:bg-[#FAF7F2]"
                  >
                    <X className="h-5 w-5 text-[#3D3021]" />
                  </Button>
                </div>

                {/* روابط التنقل */}
                <nav className="flex flex-col gap-1 p-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-base font-semibold py-3 px-4 rounded-xl transition-all duration-300 ${
                        isActive(link.href)
                          ? "bg-gradient-to-r from-[#C9A962]/10 to-[#C9A962]/5 text-[#8B7355] border-r-4 border-[#C9A962]"
                          : "text-[#3D3021] hover:bg-[#FAF7F2] hover:text-[#8B7355]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* اختصار الأقسام - يفتح لوحة الأقسام المخصصة خارج القائمة الجانبية */}
                <div className="border-t border-[#FAF7F2] px-4 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      loadCategories();
                      window.setTimeout(
                        () => setIsCategoriesMenuOpen(true),
                        180,
                      );
                    }}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-[#C9A962]/30 bg-gradient-to-l from-[#FAF7F2] to-white p-3 text-right shadow-sm transition-all hover:border-[#C9A962] hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white shadow-md">
                      <LayoutGrid className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-[#3D3021]">
                        تسوقي حسب الأقسام
                      </span>
                      <span className="mt-0.5 block text-xs text-[#8B7355]">
                        {categoriesTree.length || 15} قسماً · فئات فرعية متعددة
                      </span>
                    </span>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-[#C9A962] transition-transform group-hover:-translate-x-1" />
                  </button>
                </div>

                <div className="flex-1" />

                {/* إجراءات سريعة (أيقونات الجوال) */}
                <div className="p-4 space-y-3 border-t border-[#FAF7F2]">
                  {/* الإشعارات */}
                  {user && (
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-[#3D3021] flex items-center gap-2">
                        <Bell className="h-5 w-5 text-[#C9A962]" />
                        الإشعارات
                      </span>
                      <NotificationBell userId={user.id} />
                    </div>
                  )}

                  {/* المفضلة */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-[#3D3021] hover:bg-[#FAF7F2] py-5"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleWishlistClick();
                    }}
                  >
                    <Heart className="h-5 w-5" />
                    <span>المفضلة</span>
                    {wishlistItemCount > 0 && (
                      <Badge className="ml-auto bg-rose-500 text-white">
                        {wishlistItemCount}
                      </Badge>
                    )}
                  </Button>

                  {/* السلة */}
                  <Link
                    href="/cart"
                    className="w-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-[#3D3021] hover:bg-[#FAF7F2] py-5"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span>السلة</span>
                      {cartItemCount > 0 && (
                        <Badge className="ml-auto bg-[#C9A962] text-white">
                          {cartItemCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                </div>

                {/* قسم المستخدم */}
                <div className="p-4 border-t border-[#FAF7F2]">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-[#3D3021] truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-[#8B7355] truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      {onViewStore && viewMode === "dashboard" && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 py-5 rounded-xl border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"
                          onClick={() => {
                            onViewStore();
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Store className="h-5 w-5" />
                          عرض المتجر
                        </Button>
                      )}
                      {onViewDashboard && viewMode === "store" && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 py-5 rounded-xl border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"
                          onClick={() => {
                            onViewDashboard();
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          لوحة التحكم
                        </Button>
                      )}
                      {onLogout && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-5 rounded-xl"
                          onClick={() => {
                            clearDemoSession();
                            onLogout();
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="h-5 w-5" />
                          تسجيل الخروج
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white py-6 rounded-xl text-base"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuth();
                      }}
                    >
                      تسجيل الدخول
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* لوحة الأقسام الفاخرة - جوال */}
          <Sheet
            open={isCategoriesMenuOpen}
            onOpenChange={(open) => {
              setIsCategoriesMenuOpen(open);
              if (open) loadCategories();
              else setMobileCategorySlug("");
            }}
          >
            <SheetContent
              side="bottom"
              className="h-[88vh] rounded-t-[28px] border-0 bg-[#FCFAF6] p-0 [&>button]:hidden"
            >
              <SheetTitle className="sr-only">تسوقي حسب الأقسام</SheetTitle>
              <div className="flex h-full flex-col">
                {/* مقبض السحب */}
                <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-[#E4D9C8]" />

                {/* رأس اللوحة */}
                <div className="flex shrink-0 items-center justify-between border-b border-[#EFE7DB] px-5 pb-4 pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3D3021] to-[#5A4A35] text-[#C9A962] shadow-lg">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#C9A962]">
                        زينة
                      </p>
                      <h2 className="text-lg font-bold text-[#3D3021]">
                        {mobileCategory
                          ? mobileCategory.nameAr
                          : "تسوقي حسب الأقسام"}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoriesMenuOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#8B7355] shadow-sm transition-colors hover:bg-[#FAF7F2] hover:text-[#3D3021]"
                    aria-label="إغلاق"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* المحتوى */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {categoriesLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkles className="h-8 w-8 text-[#C9A962]" />
                      </motion.div>
                      <p className="mt-3 text-sm text-[#8B7355]">
                        جاري تحميل الأقسام...
                      </p>
                    </div>
                  ) : mobileCategory ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setMobileCategorySlug("")}
                        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[#8B7355] hover:text-[#3D3021]"
                      >
                        <ArrowRight className="h-4 w-4 text-[#C9A962]" />
                        كل الأقسام
                      </button>

                      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#E8E0D8] bg-white p-3 shadow-sm">
                        {mobileCategory.image ? (
                          <img
                            src={mobileCategory.image}
                            alt={mobileCategory.nameAr}
                            className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-[#C9A962]/30"
                          />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C9A962]/10 text-[#C9A962]">
                            <Sparkles className="h-6 w-6" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#3D3021]">
                            {mobileCategory.name}
                          </p>
                          <p className="mt-1 text-xs text-[#A69B8D]">
                            {mobileCategory.children?.length || 0} فئة فرعية ·{" "}
                            {mobileCategory.productCount || 0} منتج
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {mobileCategory.children?.map((child) => (
                          <Link
                            key={child.id}
                            href={`/products?category=${child.slug}`}
                            onClick={() => setIsCategoriesMenuOpen(false)}
                            className="group flex items-center gap-2.5 rounded-2xl border border-[#EDE5DA] bg-white p-3 shadow-sm transition-all hover:border-[#C9A962]/60 hover:shadow-md"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C9A962]/10 text-[#C9A962] transition-colors group-hover:bg-[#C9A962] group-hover:text-white">
                              <Tag className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[#3D3021]">
                                {child.nameAr}
                              </span>
                              <span className="text-[10px] text-[#A69B8D]">
                                {child.productCount || 0} منتج
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>

                      <Link
                        href={`/products?category=${mobileCategory.slug}`}
                        onClick={() => setIsCategoriesMenuOpen(false)}
                        className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#3D3021] to-[#4A3D2E] px-4 py-3.5 text-white shadow-lg transition hover:from-[#4A3D2E] hover:to-[#5A4A35]"
                      >
                        <span className="text-sm font-bold">
                          عرض كل {mobileCategory.nameAr}
                        </span>
                        <ChevronLeft className="h-4 w-4 text-[#C9A962]" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categoriesTree.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setMobileCategorySlug(category.slug)}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-[#EDE5DA] bg-white p-2.5 text-right shadow-sm transition-all hover:border-[#C9A962]/60 hover:shadow-md"
                        >
                          {category.image ? (
                            <img
                              src={category.image}
                              alt={category.nameAr}
                              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-[#C9A962]/25"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C9A962]/10 text-[#C9A962]">
                              <Sparkles className="h-5 w-5" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[#3D3021]">
                              {category.nameAr}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[#A69B8D]">
                              {category.children?.length || 0} فئة فرعية ·{" "}
                              {category.productCount || 0} منتج
                            </span>
                          </span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF7F2] text-[#C9A962] transition-colors group-hover:bg-[#C9A962] group-hover:text-white">
                            <ChevronLeft className="h-4 w-4" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* تذييل اللوحة */}
                <div className="shrink-0 border-t border-[#EFE7DB] bg-white/90 p-4 backdrop-blur">
                  <Link
                    href="/products"
                    onClick={() => setIsCategoriesMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#C9A962] to-[#B8956E] px-4 py-3.5 text-sm font-bold text-white shadow-lg transition hover:from-[#B8956E] hover:to-[#9A7B4F]"
                  >
                    <Sparkles className="h-4 w-4" />
                    تصفح جميع المنتجات
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <motion.img
              src="/zeina-logo-header.png"
              alt="زينة"
              className="h-10 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              whileHover={{ scale: 1.05 }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            <div
              className="relative"
              onMouseEnter={openMegaMenu}
            >
              <button
                type="button"
                onClick={() => {
                  setIsMegaOpen((open) => !open);
                  loadCategories();
                }}
                className={`flex items-center gap-1.5 font-medium transition-all duration-300 py-2 text-base ${
                  isMegaOpen
                    ? "text-[#8B7355]"
                    : "text-[#3D3021] hover:text-[#8B7355]"
                }`}
                aria-expanded={isMegaOpen}
              >
                جميع الأقسام
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${
                    isMegaOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-medium transition-all duration-300 relative py-2 text-base ${
                  isActive(link.href)
                    ? "text-[#8B7355]"
                    : "text-[#3D3021] hover:text-[#8B7355]"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C9A962] to-[#B8956E] rounded-full"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions - Desktop Only (مخفية على الجوال) */}
          <div className="hidden md:flex items-center gap-1 md:gap-2">
            {user && <NotificationBell userId={user.id} />}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-[#FAF7F2] rounded-full shrink-0 h-10 w-10"
              onClick={handleWishlistClick}
            >
              <Heart className="h-5 w-5 text-[#3D3021]" />
              {wishlistItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs rounded-full"
                >
                  {wishlistItemCount}
                </motion.span>
              )}
            </Button>
            <Link href="/cart" className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-[#FAF7F2] rounded-full shrink-0 h-10 w-10"
              >
                <ShoppingCart className="h-5 w-5 text-[#3D3021]" />
                {cartItemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white text-xs rounded-full"
                  >
                    {cartItemCount}
                  </motion.span>
                )}
              </Button>
            </Link>

            {/* User Menu - Desktop */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  {onViewStore && viewMode === "dashboard" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewStore}
                      className="gap-2 hover:bg-[#FAF7F2] text-[#3D3021]"
                    >
                      <Store className="h-4 w-4" />
                      <span className="hidden xl:inline">المتجر</span>
                    </Button>
                  )}
                  {onViewDashboard && viewMode === "store" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewDashboard}
                      className="gap-2 hover:bg-[#FAF7F2] text-[#3D3021]"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden xl:inline">حسابي</span>
                    </Button>
                  )}
                  {onLogout && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        clearDemoSession();
                        onLogout();
                      }}
                      className="hover:bg-rose-50 text-rose-600 hover:text-rose-700"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white gap-2 px-4 sm:px-6"
                  onClick={onOpenAuth}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                </Button>
              )}
            </div>
          </div>

          {/* زر الأقسام للجوال - خارج القائمة الجانبية */}
          <button
            type="button"
            onClick={() => {
              setIsCategoriesMenuOpen(true);
              loadCategories();
            }}
            aria-label="تسوقي حسب الأقسام"
            className="group flex shrink-0 items-center gap-2 rounded-full border border-[#C9A962]/40 bg-gradient-to-l from-[#FAF7F2] to-white px-3 py-2 shadow-sm transition-all hover:border-[#C9A962] hover:shadow-md lg:hidden"
          >
            <LayoutGrid className="h-5 w-5 text-[#8B7355] transition-colors group-hover:text-[#C9A962]" />
            <span className="text-xs font-bold text-[#3D3021]">الأقسام</span>
          </button>
        </div>
      </div>

      {/* Mega menu - desktop */}
      <AnimatePresence>
        {isMegaOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 hidden overflow-hidden rounded-b-[28px] border-t-2 border-[#C9A962] bg-[#FFFDF9] shadow-[0_30px_80px_-20px_rgba(61,48,33,0.45)] lg:block"
          >
            <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#C9A962]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-[#B8956E]/10 blur-3xl" />
            <div className="container relative mx-auto px-4">
              <div className="grid min-h-[420px] grid-cols-[300px_1fr]">
                {/* الفئات الرئيسية */}
                <div className="max-h-[72vh] overflow-y-auto border-l border-[#EFE7DB] bg-gradient-to-b from-[#FAF7F2] to-[#F6F0E6] py-5 pl-1">
                  <div className="mb-3 flex items-center justify-between px-5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#C9A962]">
                        زينة
                      </p>
                      <p className="text-sm font-bold text-[#3D3021]">
                        تصفحي الأقسام
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#8B7355] shadow-sm">
                      {categoriesTree.length || 15}
                    </span>
                  </div>
                  <div className="space-y-1 px-3">
                    {categoriesTree.map((category) => {
                      const isActive =
                        activeMegaCategory?.slug === category.slug;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onMouseEnter={() => setActiveMegaSlug(category.slug)}
                          onClick={() => setActiveMegaSlug(category.slug)}
                          className={`group flex w-full items-center gap-3 rounded-xl border-r-[3px] p-2 pr-3 text-right transition-all ${
                            isActive
                              ? "border-[#C9A962] bg-white shadow-sm"
                              : "border-transparent hover:bg-white/70"
                          }`}
                        >
                          {category.image ? (
                            <img
                              src={category.image}
                              alt={category.nameAr}
                              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-[#C9A962]/20"
                            />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C9A962]/10 text-[#C9A962]">
                              <Sparkles className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm ${
                                isActive
                                  ? "font-bold text-[#8B7355]"
                                  : "font-semibold text-[#3D3021]"
                              }`}
                            >
                              {category.nameAr}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-[#A69B8D]">
                              {category.children?.length || 0} فئة ·{" "}
                              {category.productCount || 0} منتج
                            </span>
                          </span>
                          <ChevronLeft
                            className={`h-3.5 w-3.5 shrink-0 text-[#C9A962] transition-all ${
                              isActive
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* الفئات الفرعية للقسم النشط */}
                <div className="max-h-[72vh] overflow-y-auto p-7">
                  {categoriesLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkles className="h-8 w-8 text-[#C9A962]" />
                      </motion.div>
                      <p className="mt-3 text-sm text-[#8B7355]">
                        جاري تحميل الأقسام...
                      </p>
                    </div>
                  ) : activeMegaCategory ? (
                    <>
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {activeMegaCategory.image ? (
                            <img
                              src={activeMegaCategory.image}
                              alt={activeMegaCategory.nameAr}
                              className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md ring-2 ring-white"
                            />
                          ) : (
                            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#C9A962]/10 text-[#C9A962]">
                              <Sparkles className="h-7 w-7" />
                            </span>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-bold text-[#3D3021]">
                                {activeMegaCategory.nameAr}
                              </h3>
                              <span className="rounded-full bg-[#C9A962]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
                                {activeMegaCategory.name}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[#8B7355]">
                              {activeMegaCategory.children?.length || 0} فئة
                              فرعية · {activeMegaCategory.productCount || 0}{" "}
                              منتج
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/products?category=${activeMegaCategory.slug}`}
                          onClick={() => setIsMegaOpen(false)}
                          className="shrink-0 rounded-full border border-[#C9A962] px-4 py-2 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#C9A962] hover:text-white"
                        >
                          عرض الكل
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                        {activeMegaCategory.children?.map((child) => (
                          <Link
                            key={child.id}
                            href={`/products?category=${child.slug}`}
                            onClick={() => setIsMegaOpen(false)}
                            className="group flex items-center gap-3 rounded-2xl border border-[#EDE5DA] bg-white p-4 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9A962]/60 hover:shadow-md"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FAF7F2] to-[#F3EADF] text-[#C9A962] ring-1 ring-[#C9A962]/15 transition-colors group-hover:from-[#C9A962] group-hover:to-[#B8956E] group-hover:text-white">
                              <Tag className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-[#3D3021]">
                                {child.nameAr}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-[#A69B8D]">
                                {child.productCount || 0} منتج
                              </span>
                            </span>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-[#C9A962] opacity-0 transition-all group-hover:-translate-x-0.5 group-hover:opacity-100" />
                          </Link>
                        ))}
                        <Link
                          href={`/products?category=${activeMegaCategory.slug}`}
                          onClick={() => setIsMegaOpen(false)}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C9A962]/50 bg-[#FAF7F2] p-4 text-sm font-bold text-[#8B7355] transition-colors hover:bg-white"
                        >
                          عرض كل {activeMegaCategory.nameAr}
                          <ChevronLeft className="h-4 w-4 text-[#C9A962]" />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="py-10 text-center text-sm text-[#8B7355]">
                      لا توجد أقسام حالياً
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#EFE7DB] py-4">
                <div className="flex items-center gap-2 text-sm text-[#8B7355]">
                  <Sparkles className="h-4 w-4 text-[#C9A962]" />
                  {categoriesTree.length} قسماً رئيسياً · فئات متعددة مختارة
                  بعناية
                </div>
                <div className="flex items-center gap-5">
                  <Link
                    href="/categories"
                    onClick={() => setIsMegaOpen(false)}
                    className="text-sm font-semibold text-[#8B7355] transition-colors hover:text-[#3D3021]"
                  >
                    كل الأقسام
                  </Link>
                  <Link
                    href="/products"
                    onClick={() => setIsMegaOpen(false)}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-l from-[#C9A962] to-[#B8956E] px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:from-[#B8956E] hover:to-[#9A7B4F] hover:shadow-lg"
                  >
                    تصفح جميع المنتجات
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
