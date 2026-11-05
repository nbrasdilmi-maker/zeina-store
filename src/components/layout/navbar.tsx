"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { clearDemoSession } from "@/lib/demo-client";

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
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
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
          <nav className="hidden lg:flex items-center gap-8">
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

          {/* زر القائمة للجوال (يظهر فقط الأيقونة الأساسية) */}
          <div className="md:hidden">
            {/* نترك المساحة فارغة أو نضع شيئًا بسيطًا مثل شعار صغير */}
          </div>
        </div>
      </div>
    </header>
  );
}
