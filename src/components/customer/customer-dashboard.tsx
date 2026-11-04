/**
 * Customer Account Dashboard
 * Shows orders, profile, wishlist
 */

"use client";

import { useState, useEffect } from "react";
import { ReuploadProofDialog } from "./reupload-proof-dialog";
import { AgentInbox } from "@/components/chat/agent-inbox";
import { motion } from "framer-motion";
import { NotificationBell } from "../layout/notification-bell";
import { pusherClient } from "@/lib/pusher";
import {
  User,
  Package,
  Heart,
  Settings,
  LogOut,
  ChevronLeft,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Eye,
  Loader2,
  Edit,
  Save,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Home,
  AlertCircle,
  FileText,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

interface CustomerDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
    isVerified: boolean;
  };
  onLogout: () => void;
  onViewStore?: () => void;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  address: string;
  phone: string;
  paymentMethod?: string;
  paymentDetails?: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      nameAr: string;
      mainImage: string;
      price: number;
    };
  }>;
  customer?: {
    name: string;
    email: string;
  };
}

export function CustomerDashboard({
  user,
  onLogout,
  onViewStore,
}: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReuploadOpen, setIsReuploadOpen] = useState(false);
  const [orderToReupload, setOrderToReupload] = useState<Order | null>(null);
  const { state: wishlist, removeItem } = useWishlist();
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    phone: user.phone,
    address: user.address || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch orders
  useEffect(() => {
    fetchOrders();
  }, [user.id]);

  // ⚡ التحديث اللحظي للزبون: تحديث الطلبات فور تغير حالتها من الإدارة أو وصول إشعار
  useEffect(() => {
    if (!pusherClient || !user?.id) return;
    const channel = pusherClient.subscribe(`user-${user?.id}`);
    channel.bind("new-notification", () => {
      // تحديث قائمة الطلبات صامتاً في الخلفية عند وصول الإشعار
      fetchOrders();
    });

    return () => {
      pusherClient?.unsubscribe(`user-${user?.id}`);
    };
  }, [user?.id]);
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders?customerId=${user.id}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "PROCESSING":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "SHIPPED":
        return <Truck className="h-4 w-4 text-purple-500" />;
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "قيد الانتظار", className: "bg-yellow-500" },
      PROCESSING: { label: "قيد التجهيز", className: "bg-blue-500" },
      SHIPPED: { label: "تم الشحن", className: "bg-purple-500" },
      DELIVERED: { label: "تم التسليم", className: "bg-green-500" },
      CANCELLED: { label: "ملغي", className: "bg-red-500" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-YE")} ر.ي`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: profileForm.name,
          phone: profileForm.phone,
          address: profileForm.address,
        }),
      });

      if (response.ok) {
        toast({
          title: "تم التحديث",
          description: "تم تحديث بياناتك بنجاح",
        });
        setIsEditing(false);
        // Update localStorage
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          userData.name = profileForm.name;
          userData.phone = profileForm.phone;
          userData.address = profileForm.address;
          localStorage.setItem("user", JSON.stringify(userData));
        }
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحديث",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/products" className="flex items-center gap-2">
              <img
                src="/zeina-logo-header.png"
                alt="زينة"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="flex items-center gap-3">
              {/* View Store Button */}
              {onViewStore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewStore}
                  className="gap-2 border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">المتجر</span>
                </Button>
              )}

              <Link href="/products">
                <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">تسوق الآن</span>
                </Button>
              </Link>

              {/* زر الدردشة الجديد 👈 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsChatOpen(true)}
                className="relative hover:bg-gray-100"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <NotificationBell userId={user.id} />
              <Avatar>
                <AvatarFallback className="bg-[var(--gold)] text-white">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-xl font-bold mb-1">أهلاً بكِ، {user.name}! 👋</h1>
          <p className="opacity-90">اكتشفي أحدث المنتجات والعروض الحصرية</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 backdrop-blur-sm border p-1 mb-6 flex-wrap h-auto">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              طلباتي
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2">
              <Heart className="h-4 w-4" />
              المفضلة ({wishlist.itemCount})
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              حسابي
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>طلباتي ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">لا توجد طلبات حالياً</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <span className="font-mono text-sm">
                                #{order.id.slice(-8)}
                              </span>
                            </div>
                            {getStatusBadge(order.status)}
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            {order.items.slice(0, 3).map((item, index) => (
                              <div
                                key={index}
                                className="w-12 h-12 rounded-md overflow-hidden"
                              >
                                <img
                                  src={item.product.mainImage}
                                  alt={item.product.nameAr}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center text-xs font-medium">
                                +{order.items.length - 3}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-500">
                                {formatDate(order.createdAt)}
                              </p>
                              <p className="font-bold text-[var(--gold-dark)]">
                                {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4 ml-1" />
                              التفاصيل
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>قائمة الأمنيات ({wishlist.itemCount})</CardTitle>
              </CardHeader>
              <CardContent>
                {wishlist.itemCount === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      لم تضف أي منتجات للمفضلة بعد
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {wishlist.items.map((item) => (
                      <div
                        key={item.productId}
                        className="group relative bg-gray-50 rounded-lg overflow-hidden"
                      >
                        <div className="aspect-square">
                          <img
                            src={item.image}
                            alt={item.nameAr}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {item.nameAr}
                          </h4>
                          <p className="font-bold text-[var(--gold-dark)]">
                            {item.price.toLocaleString()} ر.ي
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 left-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeItem(item.productId)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>معلومات الحساب</CardTitle>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 ml-2" />
                    تعديل
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback className="bg-[var(--gold)] text-white text-2xl">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">{user.name}</h3>
                      <p className="text-gray-500">{user.email}</p>
                      {user.isVerified && (
                        <Badge className="bg-green-500 mt-1">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          موثق
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Form */}
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        الاسم
                      </label>
                      <Input
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            name: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        البريد الإلكتروني
                      </label>
                      <Input value={user.email} disabled />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        رقم الهاتف
                      </label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            phone: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        العنوان
                      </label>
                      <Input
                        value={profileForm.address}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            address: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                        placeholder="المدينة، الحي"
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                        onClick={handleUpdateProfile}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 ml-2" />
                            حفظ التغييرات
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setIsEditing(false);
                          setProfileForm({
                            name: user.name,
                            phone: user.phone,
                            address: user.address || "",
                          });
                        }}
                      >
                        إلغاء
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              تفاصيل الطلب #{selectedOrder?.id.slice(-8)}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">الحالة:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="font-medium">معلومات التوصيل</p>
                <p className="text-sm text-gray-600">
                  📍 {selectedOrder.address}
                </p>
                <p className="text-sm text-gray-600">
                  📞 {selectedOrder.phone}
                </p>
              </div>

              {/* Payment Details Section */}
              <div className="p-4 bg-[var(--gold)]/10 rounded-lg space-y-2 border border-[var(--gold)]/20">
                <p className="font-medium text-[var(--gold-dark)]">
                  تفاصيل الدفع
                </p>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="opacity-70">طريقة الدفع: </span>
                    {selectedOrder.paymentMethod === "transfer"
                      ? "حوالة صرافة"
                      : "محفظة إلكترونية"}
                  </p>

                  {selectedOrder.paymentDetails &&
                    (() => {
                      try {
                        const details =
                          typeof selectedOrder.paymentDetails === "string"
                            ? JSON.parse(selectedOrder.paymentDetails)
                            : selectedOrder.paymentDetails;

                        return (
                          <div className="pt-1 space-y-2">
                            {details.transferNumber && (
                              <p className="font-bold text-blue-600">
                                رقم الحوالة: {details.transferNumber}
                              </p>
                            )}
                            {details.wallet && (
                              <p className="font-medium">
                                المحفظة:{" "}
                                {details.wallet === "jeib"
                                  ? "جيب"
                                  : details.wallet === "kash"
                                    ? "كاش"
                                    : "جوالي"}
                              </p>
                            )}
                            {details.proofImage && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1 bg-white border-[var(--gold)] hover:bg-[var(--gold)] hover:text-white transition-all"
                                onClick={() =>
                                  window.open(details.proofImage, "_blank")
                                }
                              >
                                <Eye className="h-4 w-4 ml-2" />
                                فتح صورة الإثبات من السحابة
                              </Button>
                            )}
                          </div>
                        );
                      } catch (e) {
                        return null;
                      }
                    })()}
                </div>
              </div>
              {/* --- إضافة جديدة: قسم مراجعة نص رسالة الواتساب --- */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-2 border border-blue-100 overflow-hidden">
                <p className="font-black text-blue-900 text-xs flex items-center gap-2">
                  <FileText className="h-4 w-4" /> مراجعة نص رسالة الطلب
                  المرسلة:
                </p>
                <div className="bg-white p-3 rounded border border-blue-100 shadow-inner">
                  <ScrollArea className="h-28 w-full text-[10px] leading-relaxed text-gray-600 font-mono whitespace-pre-wrap overflow-auto">
                    {/* بناء نص الرسالة للعرض فقط لكي يتأكد العميل مما أرسله */}
                    {selectedOrder
                      ? `*طلب جديد من متجر زينة* 🛒\n\n👤 *الاسم:* ${selectedOrder.customer?.name || "غير معروف"}\n📞 *الهاتف:* ${selectedOrder.phone}\n📍 *العنوان:* ${selectedOrder.address}\n💰 *الإجمالي:* ${formatCurrency(selectedOrder.totalAmount)}`
                      : "جاري تحميل بيانات الرسالة..."}
                  </ScrollArea>
                </div>
              </div>

              {/* --- إضافة جديدة: زر إعادة رفع الإثبات (يظهر فقط عند الرفض CANCELLED) --- */}
              {selectedOrder.status === "CANCELLED" && (
                <div className="p-4 bg-red-50 rounded-xl border-2 border-dashed border-red-200 text-center space-y-3 my-2 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-center gap-2 text-red-700 font-black text-sm">
                    <AlertCircle className="h-5 w-5" />
                    <span>عذراً، تم رفض إثبات الدفع!</span>
                  </div>
                  <p className="text-[11px] text-red-600 leading-tight">
                    يبدو أن هناك خطأ في صورة الحوالة أو البيانات. لا تقلق، يمكنك
                    تصحيح ذلك الآن.
                  </p>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black gap-2 h-11 shadow-lg"
                    onClick={() => {
                      setOrderToReupload(selectedOrder); // 👈 قمنا بتغييرها إلى الدالة الصحيحة
                      setSelectedOrder(null);
                      setTimeout(() => {
                        setIsReuploadOpen(true);
                      }, 300);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" /> البدء في إعادة رفع الإثبات
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <p className="font-medium">المنتجات</p>
                {selectedOrder.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                  >
                    <img
                      src={item.product.mainImage}
                      alt={item.product.nameAr}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {item.product.nameAr}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.price.toLocaleString()} ر.ي × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold">
                      {(item.price * item.quantity).toLocaleString()} ر.ي
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>المجموع:</span>
                <span className="text-[var(--gold-dark)]">
                  {formatCurrency(selectedOrder.totalAmount)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة الدردشة الموحدة للعميل */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white">
          {/* استدعاء الواجهة مع تمرير معرف العميل وتحديد دوره كـ CUSTOMER 👈 */}
          <AgentInbox agentId={user.id} agentRole="CUSTOMER" />
        </DialogContent>
      </Dialog>

      {/* --- إضافة نافذة إعادة رفع إثبات الدفع المستقلة --- */}
      <ReuploadProofDialog
        isOpen={isReuploadOpen}
        onClose={() => {
          setIsReuploadOpen(false);
          setOrderToReupload(null);
        }}
        order={orderToReupload}
        onSuccess={fetchOrders} // سيقوم بتحديث قائمة الطلبات تلقائياً بعد نجاح الرفع
      />
    </div>
  );
}
