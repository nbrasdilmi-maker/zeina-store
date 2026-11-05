"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  ChevronLeft,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  History,
  AlertCircle,
  Tag,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthModals } from "@/components/auth/auth-modals";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { useCart } from "@/contexts/cart-context";
import {
  useAccounting,
  AccountingProvider,
} from "@/contexts/accounting-context";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  clearDemoSession,
  isGuestCheckoutEnabled,
  readAnyUser,
} from "@/lib/demo-client";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    nameAr: string;
    mainImage: string;
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  createdAt: string;
  items: OrderItem[];
  paymentStatus: string;
}

// ✅ تم تغليف الصفحة بـ AccountingProvider
export default function CartPage() {
  return (
    <AccountingProvider>
      <CartContent />
    </AccountingProvider>
  );
}

function CartContent() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "store">("store");
  const [activeTab, setActiveTab] = useState("cart");
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const { state: cartState, updateQuantity, removeItem, clearCart } = useCart();

  const { fetchWithAuth } = useAccounting();

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
      const stored = readAnyUser();
      if (stored) {
        setUser(stored);
      }
    });
  }, []);

  useEffect(() => {
    if (user && activeTab === "orders") {
      fetchPastOrders();
    }
  }, [user, activeTab]);

  const fetchPastOrders = async () => {
    if (!user) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetchWithAuth(`/api/orders?customerId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setPastOrders(data.orders || []);
      }
    } catch (error) {
      console.error("فشل جلب الطلبات السابقة:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleLogout = () => {
    clearDemoSession();
    setUser(null);
    setViewMode("store");
    window.location.reload();
  };

  const handleCheckout = () => {
    if (!user && !isGuestCheckoutEnabled()) {
      setIsAuthOpen(true);
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleApplyPromo = () => {
    setPromoError("");
    if (!promoCode.trim()) return;
    if (promoCode.toLowerCase() === "tarifa10") {
      setPromoApplied(true);
      toast({ title: "تم", description: "تم تطبيق خصم 10% بنجاح!" });
    } else {
      setPromoError("الكود غير صالح");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: string; icon: any }
    > = {
      PENDING: {
        label: "قيد الانتظار",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: Clock,
      },
      PROCESSING: {
        label: "قيد التجهيز",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: Package,
      },
      SHIPPED: {
        label: "تم الشحن",
        color: "bg-purple-100 text-purple-700 border-purple-200",
        icon: Truck,
      },
      DELIVERED: {
        label: "تم التسليم",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: CheckCircle,
      },
      COMPLETED: {
        label: "مكتمل",
        color: "bg-green-100 text-green-700 border-green-200",
        icon: CheckCircle,
      },
      CANCELLED: {
        label: "ملغي",
        color: "bg-rose-100 text-rose-700 border-rose-200",
        icon: XCircle,
      },
    };
    const config = statusMap[status] || {
      label: status,
      color: "bg-gray-100 text-gray-700 border-gray-200",
      icon: AlertCircle,
    };
    const Icon = config.icon;
    return (
      <Badge className={cn("gap-1 border", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      PENDING: {
        label: "معلق",
        color: "bg-orange-100 text-orange-700 border-orange-200",
      },
      CONFIRMED: {
        label: "مؤكد",
        color: "bg-green-100 text-green-700 border-green-200",
      },
      REJECTED: {
        label: "مرفوض",
        color: "bg-rose-100 text-rose-700 border-rose-200",
      },
    };
    const { label, color } = config[status] || {
      label: status,
      color: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return <Badge className={cn("border", color)}>{label}</Badge>;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = cartState?.cart?.items || [];
  const itemCount = cartState?.cart?.itemCount || 0;
  const total = cartState?.cart?.total || 0;
  const discount = cartState?.cart?.discount || 0;
  const promoDiscount = promoApplied ? total * 0.1 : 0;
  const finalTotal = total - promoDiscount;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FAF7F2] to-white">
      <Navbar
        user={user}
        onOpenCart={() => {}}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onViewDashboard={() => setViewMode("dashboard")}
        onViewStore={() => setViewMode("store")}
        viewMode={viewMode}
      />

      <AuthModals
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultTab="login"
      />

      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={items}
        userId={user?.id || ""}
        onSessionReady={(guestUser) => setUser(guestUser)}
        onSuccess={() => {
          clearCart();
          setPromoApplied(false);
          setPromoCode("");
          const stored = readAnyUser();
          if (stored) setUser(stored);
          setActiveTab("orders");
        }}
      />

      <main className="flex-1 pt-20 md:pt-24 pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center shadow-md">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#3D3021]">
                سلة التسوق
              </h1>
              {itemCount > 0 && (
                <p className="text-sm text-[#8B7355]">
                  {itemCount} {itemCount === 1 ? "منتج" : "منتجات"} في سلتك
                </p>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#F5EFE6] p-1 rounded-full">
              <TabsTrigger
                value="cart"
                className="rounded-full data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
              >
                <ShoppingCart className="h-4 w-4 ml-2" />
                السلة الحالية
                {itemCount > 0 && (
                  <Badge className="ml-2 bg-white/20 text-white text-xs">
                    {itemCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="rounded-full data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
                disabled={!user}
              >
                <History className="h-4 w-4 ml-2" />
                طلباتي السابقة
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cart" className="space-y-6">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative mb-6 inline-block"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#C9A962]/20 to-[#B8956E]/20 rounded-full blur-2xl" />
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6] flex items-center justify-center border border-[#E8E0D8] shadow-inner">
                      <ShoppingCart className="h-16 w-16 text-[#C9A962]" />
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-[#3D3021] mb-2">
                    سلتك فارغة
                  </h2>
                  <p className="text-[#8B7355] mb-8 max-w-md mx-auto">
                    لم تقم بإضافة أي منتجات بعد. استكشف مجموعتنا الفاخرة واملأ
                    سلتك بأجمل القطع.
                  </p>
                  <Link href="/products">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full px-8 py-6 text-lg shadow-lg"
                    >
                      <Sparkles className="h-5 w-5 ml-2" />
                      تصفح المنتجات
                      <ChevronLeft className="h-5 w-5 mr-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.div
                          key={item.productId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="group"
                        >
                          <Card className="overflow-hidden border-[#E8E0D8] hover:shadow-lg hover:border-[#C9A962]/30 transition-all duration-300">
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative w-full sm:w-28 h-40 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-[#FAF7F2] shadow-inner">
                                  <img
                                    src={item.image}
                                    alt={item.nameAr}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                  {item.originalPrice &&
                                    item.originalPrice > item.price && (
                                      <div className="absolute top-2 right-2">
                                        <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold px-2 py-1 shadow-md">
                                          خصم{" "}
                                          {Math.round(
                                            ((item.originalPrice - item.price) /
                                              item.originalPrice) *
                                              100,
                                          )}
                                          %
                                        </Badge>
                                      </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-3">
                                  <div>
                                    <h4 className="font-bold text-[#3D3021] text-lg leading-tight line-clamp-2">
                                      {item.nameAr}
                                    </h4>
                                    {item.color && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span
                                          className="w-4 h-4 rounded-full border border-gray-300"
                                          style={{
                                            backgroundColor: item.color,
                                          }}
                                        />
                                        <p className="text-sm text-[#8B7355]">
                                          اللون: {item.color}
                                        </p>
                                      </div>
                                    )}
                                    <p className="text-xs text-[#A69B8D] mt-1 line-clamp-1">
                                      {item.name}
                                    </p>
                                  </div>

                                  <div className="flex items-baseline gap-3">
                                    <span className="font-bold text-xl text-[#8B7355]">
                                      {(item.price || 0).toLocaleString()} ر.ي
                                    </span>
                                    {item.originalPrice &&
                                      item.originalPrice >
                                        (item.price || 0) && (
                                        <span className="text-base text-[#A69B8D] line-through">
                                          {item.originalPrice.toLocaleString()}{" "}
                                          ر.ي
                                        </span>
                                      )}
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 bg-[#FAF7F2] rounded-full p-1.5 border border-[#E8E0D8]">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-10 w-10 p-0 rounded-full hover:bg-white"
                                        onClick={() =>
                                          updateQuantity(
                                            item.productId,
                                            item.quantity - 1,
                                          )
                                        }
                                      >
                                        <Minus className="h-5 w-5" />
                                      </Button>
                                      <span className="w-12 text-center font-bold text-[#3D3021] text-lg">
                                        {item.quantity}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-10 w-10 p-0 rounded-full hover:bg-white"
                                        onClick={() =>
                                          updateQuantity(
                                            item.productId,
                                            item.quantity + 1,
                                          )
                                        }
                                        disabled={item.quantity >= item.stock}
                                      >
                                        <Plus className="h-5 w-5" />
                                      </Button>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      className="h-12 w-12 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                      onClick={() => removeItem(item.productId)}
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </div>
                                  {item.quantity >= item.stock && (
                                    <p className="text-sm text-amber-600 flex items-center gap-1">
                                      <AlertCircle className="h-4 w-4" />
                                      الحد الأقصى للمخزون
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {items.length > 0 && (
                      <Button
                        variant="ghost"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={clearCart}
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        إفراغ السلة
                      </Button>
                    )}
                  </div>

                  <div>
                    <Card className="sticky top-24 border-[#E8E0D8] shadow-lg">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-xl text-[#3D3021] mb-6">
                          ملخص الطلب
                        </h3>

                        <div className="mb-6">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                placeholder="كود الخصم"
                                value={promoCode}
                                onChange={(e) => {
                                  setPromoCode(e.target.value);
                                  setPromoError("");
                                }}
                                disabled={promoApplied}
                                className={`w-full border rounded-xl h-12 px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#C9A962]/50 transition-all ${
                                  promoApplied
                                    ? "bg-green-50 border-green-300"
                                    : "border-[#E8E0D8] bg-[#FAF7F2]"
                                }`}
                              />
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#C9A962]" />
                            </div>
                            <Button
                              variant="outline"
                              onClick={handleApplyPromo}
                              disabled={promoApplied || !promoCode.trim()}
                              className="border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2] rounded-xl h-12 px-5 font-medium"
                            >
                              تطبيق
                            </Button>
                          </div>
                          {promoError && (
                            <p className="text-sm text-rose-500 mt-2 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {promoError}
                            </p>
                          )}
                          {promoApplied && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-emerald-600 mt-2 flex items-center gap-2 bg-emerald-50 p-2 rounded-lg"
                            >
                              <Sparkles className="h-4 w-4" />
                              تم تطبيق خصم 10% بنجاح!
                            </motion.p>
                          )}
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between">
                            <span className="text-[#5D5D5D]">
                              المجموع الفرعي ({itemCount})
                            </span>
                            <span className="font-medium text-[#3D3021]">
                              {total.toLocaleString()} ر.ي
                            </span>
                          </div>

                          {discount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span className="flex items-center gap-1">
                                <Tag className="h-4 w-4" />
                                لقد وفرت
                              </span>
                              <span className="font-medium">
                                {discount.toLocaleString()} ر.ي
                              </span>
                            </div>
                          )}

                          {promoApplied && (
                            <div className="flex justify-between text-emerald-600">
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-4 w-4" />
                                خصم الكود (10%)
                              </span>
                              <span className="font-medium">
                                -{promoDiscount.toLocaleString()} ر.ي
                              </span>
                            </div>
                          )}

                          <Separator className="bg-[#E8E0D8]" />

                          <div className="flex justify-between text-gray-500">
                            <span>التوصيل</span>
                            <span>سيُحدد لاحقاً</span>
                          </div>
                        </div>

                        <div className="border-t border-[#E8E0D8] pt-4 mb-6">
                          <div className="flex justify-between font-bold text-xl">
                            <span className="text-[#3D3021]">الإجمالي</span>
                            <span className="text-[#8B7355]">
                              {finalTotal.toLocaleString()} ر.ي
                            </span>
                          </div>
                          <p className="text-xs text-[#A69B8D] mt-1">
                            شامل ضريبة القيمة المضافة
                          </p>
                        </div>

                        <Button
                          className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white py-7 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                          onClick={handleCheckout}
                        >
                          {!user && !isGuestCheckoutEnabled()
                            ? "سجل الدخول للمتابعة"
                            : "إتمام الشراء"}
                          <ArrowRight className="mr-2 h-5 w-5" />
                        </Button>

                        <Link href="/products">
                          <Button
                            variant="ghost"
                            className="w-full mt-3 rounded-xl h-12"
                          >
                            متابعة التسوق
                            <ChevronLeft className="mr-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders">
              {!user ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-4">
                    <History className="h-10 w-10 text-[#C9A962]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#3D3021] mb-2">
                    سجل الطلبات
                  </h3>
                  <p className="text-[#8B7355] mb-6">
                    يرجى تسجيل الدخول لعرض طلباتك السابقة
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full px-8"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    تسجيل الدخول
                  </Button>
                </div>
              ) : isLoadingOrders ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-[#C9A962]" />
                </div>
              ) : pastOrders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-4">
                    <Package className="h-10 w-10 text-[#C9A962]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#3D3021] mb-2">
                    لا توجد طلبات سابقة
                  </h3>
                  <p className="text-[#8B7355] mb-6">
                    لم تقم بأي طلب بعد. ابدأ التسوق الآن!
                  </p>
                  <Link href="/products">
                    <Button className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full px-8">
                      تصفح المنتجات
                    </Button>
                  </Link>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {pastOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="border-[#E8E0D8] hover:shadow-md transition-all">
                          <CardContent className="p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold text-[#3D3021]">
                                  #{order.id.slice(-8).toUpperCase()}
                                </span>
                                <span className="text-sm text-[#A69B8D]">
                                  {formatDate(order.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(order.status)}
                                {getPaymentStatusBadge(order.paymentStatus)}
                              </div>
                            </div>

                            <div className="space-y-3 mb-4">
                              {order.items.slice(0, 3).map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3"
                                >
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#FAF7F2] shrink-0">
                                    <img
                                      src={item.product.mainImage}
                                      alt={item.product.nameAr}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[#3D3021] truncate">
                                      {item.product.nameAr}
                                    </p>
                                    <p className="text-sm text-[#8B7355]">
                                      {item.quantity} ×{" "}
                                      {formatCurrency(item.price)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <p className="text-sm text-[#C9A962]">
                                  +{order.items.length - 3} منتجات أخرى
                                </p>
                              )}
                            </div>

                            <Separator className="bg-[#E8E0D8] my-4" />

                            <div className="flex justify-between items-center">
                              <span className="text-[#5D5D5D]">الإجمالي:</span>
                              <span className="font-bold text-lg text-[#8B7355]">
                                {formatCurrency(order.totalAmount)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
