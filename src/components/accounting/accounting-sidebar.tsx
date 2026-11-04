"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingBag,
  Wallet,
  Package,
  Users,
  RotateCcw,
  UserCog,
  ChevronRight,
  BarChart3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounting } from "@/contexts/accounting-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area"; // ✅ استيراد ScrollArea

const menuItems = [
  {
    title: "الرئيسية",
    icon: LayoutDashboard,
    href: "/dashboard/accounting",
    permission: "view_dashboard",
  },
  {
    title: "القيود اليومية",
    icon: BookOpen,
    href: "/dashboard/accounting/journal",
    permission: "view_journal",
  },
  {
    title: "سجل عمليات وطلبات البيع",
    icon: ShoppingBag,
    href: "/dashboard/accounting/orders",
    permission: "view_orders",
  },
  {
    title: "الصندوق",
    icon: Wallet,
    href: "/dashboard/accounting/cashflow",
    permission: "view_cashflow",
  },
  {
    title: "المخازن",
    icon: Package,
    href: "/dashboard/accounting/inventory",
    permission: "view_inventory",
  },
  {
    title: "التجار والموردين",
    icon: Users,
    href: "/dashboard/accounting/suppliers",
    permission: "view_suppliers",
  },
  {
    title: "المرتجعات",
    icon: RotateCcw,
    href: "/dashboard/accounting/returns",
    permission: "view_returns",
  },
  {
    title: "التقارير المالية",
    icon: BarChart3,
    href: "/dashboard/accounting/reports",
    permission: "view_dashboard",
  },
  {
    title: "الموظفين والصلاحيات",
    icon: UserCog,
    href: "/dashboard/accounting/employees",
    permission: "view_employees",
  },
];

interface AccountingSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AccountingSidebar({
  isOpen = true,
  onClose,
}: AccountingSidebarProps) {
  const pathname = usePathname();
  const { hasPermission, user } = useAccounting();

  const filteredMenuItems = menuItems.filter((item) =>
    hasPermission(item.permission as any),
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-72 bg-gradient-to-b from-[#3D3021] to-[#2A2116] text-white shadow-xl transition-transform duration-300 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#C9A962]">زينة</span>
            <span className="text-sm text-white/70">| المحاسبة</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User info */}
        {/* User info with Store Link */}
        {user && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">مرحباً،</p>
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-[#C9A962] mt-1">{user.role}</p>
              </div>
              <Link
                href="/"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="العودة للمتجر"
              >
                <span className="text-lg">⬅</span>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation with ScrollArea */}
        <ScrollArea className="flex-1 p-3">
          <nav className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all duration-200",
                    isActive
                      ? "bg-[#C9A962] text-white font-medium shadow-md"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                  onClick={onClose}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}

            <Separator className="my-4 bg-white/10" />

            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <span>← العودة للمتجر</span>
            </Link>
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-center text-white/40">
            النظام المحاسبي v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
