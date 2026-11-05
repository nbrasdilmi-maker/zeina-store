"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  Loader2,
  LogOut,
  Shield,
  Sparkles,
  Store,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  clearDemoSession,
  clearDemoShoppingSelection,
  DEMO_SESSION_EVENT,
  readDemoSession,
  requestDemoSession,
  type DemoSessionSnapshot,
} from "@/lib/demo-client";

interface RoleOption {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "ADMIN",
    label: "مدير المتجر",
    shortLabel: "مدير",
    description: "إدارة المنتجات والطلبات والتجار والمحاسبة والإعدادات",
    icon: Shield,
    accent: "bg-gradient-to-br from-[#3D3021] to-[#5A4632]",
  },
  {
    value: "MERCHANT",
    label: "تاجر",
    shortLabel: "تاجر",
    description: "إدارة متجرك ومنتجاتك ومبيعاتك وطلبات عملائك",
    icon: Store,
    accent: "bg-gradient-to-br from-[#C9A962] to-[#B8956E]",
  },
  {
    value: "AGENT",
    label: "مندوب",
    shortLabel: "مندوب",
    description: "متابعة الطلبات والتواصل مع العملاء وتحديث التوصيل",
    icon: Truck,
    accent: "bg-gradient-to-br from-[#8B7355] to-[#6F5A42]",
  },
  {
    value: "CUSTOMER",
    label: "عميل",
    shortLabel: "عميل",
    description: "تصفح المنتجات وإضافة للسلة وإنشاء الطلبات والمفضلة",
    icon: User,
    accent: "bg-gradient-to-br from-[#B8956E] to-[#9A7B4F]",
  },
];

function roleLabel(role?: string, isGuest?: boolean): string {
  if (isGuest) return "زائر";
  return (
    ROLE_OPTIONS.find((option) => option.value === role)?.label ||
    "مستخدم تجريبي"
  );
}

function roleIcon(role?: string, isGuest?: boolean): LucideIcon {
  if (isGuest) return User;
  return (
    ROLE_OPTIONS.find((option) => option.value === role)?.icon || Sparkles
  );
}

export function DemoRoleSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<DemoSessionSnapshot | null>(null);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    setSession(readDemoSession());

    const sync = () => setSession(readDemoSession());
    window.addEventListener("storage", sync);
    window.addEventListener(DEMO_SESSION_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        DEMO_SESSION_EVENT,
        sync as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelectRole = useCallback(
    async (role: string) => {
      if (loadingRole) return;

      const isSameRole =
        session?.role === role && !session.user.isGuest;

      if (isSameRole) {
        setOpen(false);
        return;
      }

      setLoadingRole(role);
      try {
        const nextSession = await requestDemoSession(role);
        setSession(nextSession);
        clearDemoShoppingSelection();
        setOpen(false);

        toast({
          title: "تم تفعيل الدور",
          description: `أنت الآن تجرب المتجر بدور ${roleLabel(role)}.`,
        });

        // Reload so every page fetches the new isolated catalog.
        window.setTimeout(() => window.location.reload(), 350);
      } catch (error) {
        toast({
          title: "تعذر تفعيل الدور",
          description:
            error instanceof Error
              ? error.message
              : "حدث خطأ أثناء إنشاء جلسة التجربة",
          variant: "destructive",
        });
        setLoadingRole(null);
      }
    },
    [loadingRole, session],
  );

  const handleExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    clearDemoSession();
    clearDemoShoppingSelection();
    setSession(null);
    setOpen(false);

    toast({
      title: "تم الخروج من جلسة التجربة",
      description:
        "يمكنك الآن اختيار دور آخر أو المتابعة كزائر والشراء دون تسجيل.",
    });

    window.setTimeout(() => window.location.reload(), 350);
  }, [isExiting]);

  if (!mounted) return null;

  const currentLabel = session
    ? roleLabel(session.role, session.user.isGuest)
    : null;
  const CurrentIcon = roleIcon(session?.role, session?.user.isGuest);
  const isGuestSession = Boolean(session?.user.isGuest);

  return (
    <>
      {/* Floating trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="اختيار الدور التجريبي"
        className={cn(
          "group fixed right-3 z-[45] flex items-center gap-3 rounded-full border border-[#C9A962]/60",
          "bg-gradient-to-l from-[#3D3021] via-[#4A3A28] to-[#5A4632] px-3.5 py-2.5 text-white",
          "shadow-[0_14px_40px_-8px_rgba(61,48,33,0.65)] backdrop-blur-md",
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C9A962] hover:shadow-[0_18px_50px_-8px_rgba(61,48,33,0.75)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A962] focus-visible:ring-offset-2",
          "sm:right-5",
          "bottom-[calc(4.75rem_+_env(safe-area-inset-bottom))] md:bottom-6",
          open && "border-[#C9A962] ring-2 ring-[#C9A962]/30",
        )}
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A962]/20 text-[#E7D6AE]">
          <CurrentIcon className="h-4 w-4" />
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#3D3021]",
              session ? "bg-emerald-400" : "bg-[#C9A962]",
            )}
          />
        </span>

        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#C9A962]">
            وضع التجربة
          </span>
          <span className="max-w-[9.5rem] truncate text-[13px] font-bold sm:text-sm">
            {currentLabel ? `دور ${currentLabel}` : "اختر دورك التجريبي"}
          </span>
        </span>

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-transform duration-300 group-hover:bg-white/15">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Floating panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label="اختيار الدور التجريبي"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            dir="rtl"
            className={cn(
              "fixed right-3 left-3 z-[45] overflow-hidden rounded-3xl border border-[#C9A962]/35",
              "bg-white/95 shadow-[0_28px_80px_-16px_rgba(61,48,33,0.55)] backdrop-blur-xl",
              "sm:left-auto sm:right-5 sm:w-[380px]",
              "bottom-[calc(8.5rem_+_env(safe-area-inset-bottom))] md:bottom-24",
            )}
          >
            <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain">
              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-l from-[#3D3021] via-[#4A3A28] to-[#5A4632] px-5 pb-4 pt-5 text-white">
                <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#C9A962]/15 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.24em] text-[#C9A962]">
                      تجربة تفاعلية
                    </p>
                    <h3 className="text-lg font-bold leading-7">
                      اختر دورك في متجر زينة
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-white/60">
                      جرّب كل أدوار المتجر ببيانات معزولة، أو تابع كزائر
                      وأكمل الشراء مباشرة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Current session */}
              {session && (
                <div className="mx-4 mt-4 rounded-2xl border border-[#C9A962]/30 bg-[#FAF7F2] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white shadow-sm">
                      <CurrentIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#A69B8D]">
                        الدور الحالي
                      </p>
                      <p className="flex items-center gap-2 truncate text-sm font-bold text-[#3D3021]">
                        {currentLabel}
                        {isGuestSession && (
                          <span className="rounded-full bg-[#C9A962]/15 px-2 py-0.5 text-[10px] font-semibold text-[#8B7355]">
                            جلسة ضيف
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExit}
                      disabled={isExiting}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isExiting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      خروج
                    </button>
                  </div>
                  <p className="mt-2 pr-1 text-[11px] leading-5 text-[#8B7355]">
                    الخروج يمسح الجلسة من هذا المتصفح فقط، ويمكنك بعدها
                    المتابعة كزائر أو اختيار دور آخر.
                  </p>
                </div>
              )}

              {/* Roles */}
              <div className="space-y-2 p-4">
                {ROLE_OPTIONS.map((role) => {
                  const active =
                    session?.role === role.value &&
                    !session.user.isGuest;
                  const isLoading = loadingRole === role.value;
                  const Icon = role.icon;

                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleSelectRole(role.value)}
                      disabled={Boolean(loadingRole)}
                      aria-pressed={active}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A962] focus-visible:ring-offset-1",
                        active
                          ? "border-[#C9A962] bg-[#C9A962]/10 shadow-sm"
                          : "border-[#EFE7DC] bg-white hover:border-[#C9A962]/50 hover:bg-[#FAF7F2]",
                        loadingRole &&
                          !isLoading &&
                          "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                          role.accent,
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-bold text-[#3D3021]">
                          {role.label}
                          {active && (
                            <span className="rounded-full bg-[#C9A962] px-2 py-0.5 text-[9px] font-bold text-white">
                              نشط
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-5 text-[#8B7355]">
                          {role.description}
                        </span>
                      </span>

                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
                          active
                            ? "bg-[#C9A962] text-white"
                            : "bg-[#FAF7F2] text-[#C9A962] group-hover:bg-[#C9A962]/15",
                        )}
                      >
                        {active ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronLeft className="h-4 w-4" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-[#EFE7DC] bg-[#FCFAF7] px-4 py-3">
                <p className="text-center text-[10px] leading-5 text-[#A69B8D]">
                  جلسة تجريبية معزولة — تُحذف بياناتها تلقائياً بعد انتهاء
                  صلاحيتها. تغيير الدور يبدأ جلسة جديدة ويفرغ السلة
                  والمفضلة.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Backward-compatible alias used by older imports. */
export const RoleSelector = DemoRoleSwitcher;
