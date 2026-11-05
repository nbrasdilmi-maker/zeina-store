"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Grid, ShoppingCart, Heart, User } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import {
  DEMO_SESSION_EVENT,
  readAnyUser,
  type DemoUser,
} from "@/lib/demo-client";

function GlobalBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state: cartState } = useCart();
  const { state: wishlistState } = useWishlist();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [mounted, setMounted] = useState(false);

  const cartCount = cartState?.cart?.itemCount || 0;
  const wishlistCount = wishlistState?.itemCount || 0;

  useEffect(() => {
    setMounted(true);
    setUser(readAnyUser());

    const sync = () => setUser(readAnyUser());
    window.addEventListener("storage", sync);
    window.addEventListener(DEMO_SESSION_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(DEMO_SESSION_EVENT, sync as EventListener);
    };
  }, []);

  // The account tab opens the login modal for visitors, and the dashboard for
  // an active demo session or a regularly signed-in customer.
  const accountHref = user ? "/?view=dashboard" : "/?auth=login";
  const isDashboardView =
    pathname === "/" && searchParams.get("view") === "dashboard";

  const navItems = [
    {
      icon: Home,
      label: "الرئيسية",
      href: "/",
      active: pathname === "/" && !isDashboardView,
    },
    {
      icon: Grid,
      label: "الأقسام",
      href: "/categories",
      active: pathname === "/categories",
    },
    {
      icon: ShoppingCart,
      label: "السلة",
      href: "/cart",
      active: pathname === "/cart",
      isCart: true,
      count: cartCount,
    },
    {
      icon: Heart,
      label: "المفضلة",
      href: "/wishlist",
      active: pathname === "/wishlist",
      isWishlist: true,
      count: wishlistCount,
    },
    {
      icon: User,
      label: "حسابي",
      href: accountHref,
      active: isDashboardView,
      isUser: true,
    },
  ];

  // Avoid a hydration mismatch: the identity only exists in browser storage.
  if (!mounted) return null;

  return (
    <nav
      aria-label="التنقل السفلي"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
    >
      {/* خلفية زجاجية فخمة مع احترام مساحة الأمان في الأجهزة الحديثة */}
      <div
        className="bg-white/95 backdrop-blur-lg border-t border-gray-100 px-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const count = item.count ?? 0;

            const content = (
              <div className="flex flex-col items-center justify-center relative w-full h-full">
                {count > 0 && (
                  <span className="absolute top-1 right-1/2 translate-x-3 bg-[#C9A962] text-white text-[10px] font-bold h-4 min-w-4 px-1 flex items-center justify-center rounded-full border border-white shadow-sm">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
                <Icon
                  className={`h-5 w-5 mb-1 transition-colors ${
                    item.active ? "text-[#8B7355]" : "text-gray-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    item.active ? "text-[#8B7355]" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
                {item.active && (
                  <motion.div
                    layoutId="globalBottomTab"
                    className="absolute -top-3 w-8 h-1 bg-[#C9A962] rounded-full"
                  />
                )}
              </div>
            );

            return (
              <Link
                key={index}
                href={item.href}
                className="flex-1 h-full"
                aria-current={item.active ? "page" : undefined}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/**
 * Mobile navigation shared by every page and every demo role.
 * Mounted once in the root layout so dashboards and store pages keep it.
 */
export function GlobalBottomNav() {
  return (
    <Suspense fallback={null}>
      <GlobalBottomNavInner />
    </Suspense>
  );
}
