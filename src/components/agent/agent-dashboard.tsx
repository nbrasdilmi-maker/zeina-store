/**
 * Agent Dashboard (المندوبة)
 * Allows agents to manage products, view orders, and chat with customers
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NotificationBell } from "../layout/notification-bell";
import { useAccounting } from "@/contexts/accounting-context";
import { pusherClient } from "@/lib/pusher";
import {
  ShoppingBag,
  Package,
  MessageSquare,
  LogOut,
  ChevronLeft,
  Bell,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Star,
  Eye,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Save,
  Upload,
  Phone,
  User,
  MapPin,
  ArrowUpRight,
  DollarSign,
  Home,
  Store,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/chat/chat-widget";
import { AgentInbox } from "@/components/chat/agent-inbox";
import { uploadImage } from "@/lib/upload";
import { ProductFormDialog } from "@/components/shared/product-form-dialog";

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

interface AgentDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  onViewStore?: () => void;
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
  images: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: { nameAr: string };
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  address: string;
  phone: string;
  governorate: string;
  paymentMethod: string;
  paymentDetails: any;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  items: Array<{
    product: { nameAr: string; mainImage?: string };
    quantity: number;
    price: number;
    color?: string;
  }>;
}

export function AgentDashboard({
  user,
  onLogout,
  onViewStore,
}: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // --- متغيرات جديدة لطلبيات المتجر (الخطوة الأولى) ---
  const [storeOrders, setStoreOrders] = useState<Order[]>([]); // لتخزين طلبات المتجر العامة
  const [orderSubTab, setOrderSubTab] = useState("my-orders"); // للتبديل بين "طلبياتي" و "طلبيات المتجر"
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  // Product dialog state
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Delivery Fees state (نافذة رسوم التوصيل)
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [governorates, setGovernorates] = useState<any[]>([]);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);
  const { hasPermission } = useAccounting();

  // دالة فتح نافذة التوصيل وجلب البيانات
  const openDeliveryDialog = async () => {
    setIsDeliveryDialogOpen(true);
    if (governorates.length > 0) return;

    setIsLoadingDelivery(true);
    try {
      const response = await fetch("/api/governorates");
      const data = await response.json();
      if (data.success) {
        setGovernorates(data.governorates || []);
      }
    } catch (error) {
      console.error("Fetch delivery fees error:", error);
    } finally {
      setIsLoadingDelivery(false);
    }
  };

  // Stats
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);
  // ⚡ التحديث اللحظي للمندوبة: تحديث الطلبات والمنتجات فور وصول إشعار
  useEffect(() => {
    if (!pusherClient || !user?.id) return;

    const channel = pusherClient.subscribe(`user-${user.id}`);

    channel.bind("new-notification", () => {
      // تحديث كل بيانات المندوبة صامتاً في الخلفية
      fetchData();
    });

    return () => {
      pusherClient.unsubscribe(`user-${user.id}`);
    };
  }, [user?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch agent's products
      let agentProductsList: Product[] = []; // أضفنا هذا المتغير
      const productsRes = await fetch(`/api/products?agentId=${user.id}`);
      if (productsRes.ok) {
        const data = await productsRes.json();
        agentProductsList = data.products || []; // حفظناها هنا
        setProducts(agentProductsList);
        setStats((prev) => ({ ...prev, products: agentProductsList.length }));
      }

      // Fetch categories
      const categoriesRes = await fetch("/api/categories");
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      // Fetch all orders (agents can see all orders)
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const allOrders = data.orders || [];

        // --- الإضافة الذكية: الفلترة والحساب ---
        // 1. استخراج أسماء منتجات المندوب
        const agentProductNames = agentProductsList.map((p) => p.nameAr);

        // 2. جلب الطلبات اللي فيها منتج واحد على الأقل من منتجات المندوب
        const agentOrders = allOrders.filter((order: Order) =>
          order.items.some((item) =>
            agentProductNames.includes(item.product?.nameAr),
          ),
        );

        // 3. حساب الأرباح لمنتجات المندوب فقط داخل هذه الطلبات
        let totalRevenue = 0;
        agentOrders.forEach((order: Order) => {
          if (order.status === "COMPLETED") {
            order.items.forEach((item) => {
              if (agentProductNames.includes(item.product?.nameAr)) {
                totalRevenue += item.price * item.quantity;
              }
            });
          }
        });
        // --- نهاية الإضافة ---

        // // Separate pending and completed orders (نستخدم agentOrders بدلاً من allOrders)
        // setOrders(agentOrders.filter((o: Order) => o.status !== "COMPLETED" && o.status !== "CANCELLED"));
        // setCompletedOrders(agentOrders.filter((o: Order) => o.status === "COMPLETED"));
        // setStats(prev => ({
        //   ...prev,
        //   orders: agentOrders.filter((o: Order) => o.status !== "COMPLETED").length,
        //   revenue: totalRevenue // نستخدم الأرباح الصافية المحسوبة فوق
        // }));

        // --- الفرز الذكي: فصل "طلبياتي" عن "طلبات المتجر" (الخطوة الثانية) ---

        // 1. طلبياتي: إما طلبات تحتوي على منتجاتي، أو طلبات قمت أنا باستلامها (agentId يطابقني)
        const myOrders = allOrders.filter(
          (order: Order) =>
            (order as any).agentId === user.id ||
            order.items.some((item) =>
              agentProductNames.includes(item.product?.nameAr),
            ),
        );

        // 2. طلبات المتجر العامة: هي كل الطلبات الباقية التي لا تخصني حالياً
        const generalStoreOrders = allOrders.filter(
          (order: Order) =>
            !myOrders.some((myOrder) => myOrder.id === order.id),
        );

        // حفظ "طلبياتي"
        setOrders(
          myOrders.filter(
            (o: Order) => o.status !== "COMPLETED" && o.status !== "CANCELLED",
          ),
        );
        setCompletedOrders(
          myOrders.filter((o: Order) => o.status === "COMPLETED"),
        );

        // حفظ "طلبات المتجر"
        setStoreOrders(generalStoreOrders);

        // تحديث إحصائيات المندوب لتشمل طلباته الخاصة فقط
        setStats((prev) => ({
          ...prev,
          orders: myOrders.filter((o: Order) => o.status !== "COMPLETED")
            .length,
          revenue: totalRevenue,
        }));
        // --- نهاية التعديل ---
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openNewProduct = () => {
    setSelectedProduct(null);
    setIsProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async (productData: any) => {
    setIsSaving(true);
    try {
      const url = "/api/products";
      const method = selectedProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم",
          description: selectedProduct ? "تم تحديث المنتج" : "تم إضافة المنتج",
        });
        setIsProductDialogOpen(false);
        setSelectedProduct(null);
        fetchData(); // تحديث البيانات بعد الحفظ
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      const response = await fetch(`/api/products?productId=${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: "تم حذف المنتج",
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-YE")} ر.ي`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "قيد الانتظار", className: "bg-yellow-500" },
      PROCESSING: { label: "قيد التجهيز", className: "bg-blue-500" },
      SHIPPED: { label: "تم الشحن", className: "bg-purple-500" },
      DELIVERED: { label: "تم التسليم", className: "bg-green-500" },
      COMPLETED: { label: "منجز", className: "bg-emerald-500" },
      CANCELLED: { label: "ملغي", className: "bg-red-500" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (response.ok) {
        toast({ title: "تم", description: "تم تحديث حالة الطلب" });
        fetchData();
      }
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ", variant: "destructive" });
    }
  };

  // --- دالة استلام طلب من المتجر ليكون بعهدتي ---
  const handleClaimOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد أنك تريد استلام وتجهيز هذا الطلب؟")) return;
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // سيتم إرسال حالة PROCESSING ومعرف المندوب agentId لتسجيله باسمه
        body: JSON.stringify({
          orderId,
          status: "PROCESSING",
          agentId: user.id,
        }),
      });
      if (response.ok) {
        toast({
          title: "تم",
          description: "تم استلام الطلب وتحويله إلى عهدتك بنجاح 📦",
        });
        fetchData(); // تحديث الواجهة فوراً
      } else {
        toast({
          title: "خطأ",
          description: "حدث خطأ أو ربما سبّقك مندوب آخر واستلمه",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    }
  };

  // Open WhatsApp
  const openWhatsApp = (phone: string, message?: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const url = message
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${cleanPhone}`;
    window.open(url, "_blank");
  };

  // Format date
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ar-SA");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img
                src="/zeina-logo-header.png"
                alt="زينة"
                className="h-10 w-auto object-contain"
              />
              <Badge className="bg-purple-500">مندوب</Badge>
            </div>

            <div className="flex items-center gap-4">
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
              {/* زر رسوم التوصيل للمندوبة */}
              <Button
                variant="outline"
                size="sm"
                onClick={openDeliveryDialog}
                className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 shadow-sm"
              >
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">رسوم التوصيل</span>
              </Button>

              <NotificationBell userId={user.id} />

              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback className="bg-purple-500 text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    مندوب
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* === بطاقات الإحصائيات الجديدة === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-md border-r-4 border-purple-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  منتجاتي بالموقع
                </p>
                <p className="text-2xl font-bold mt-1">{stats.products}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md border-r-4 border-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  طلبات قيد التنفيذ
                </p>
                <p className="text-2xl font-bold mt-1">{stats.orders}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md border-r-4 border-green-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  مبيعاتي المنجزة
                </p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatCurrency(stats.revenue)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* ================================== */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 backdrop-blur-sm border p-1 mb-6 flex-wrap h-auto">
            <TabsTrigger value="products" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              منتجاتي ({products.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              الطلبات
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثات
            </TabsTrigger>
            {/* تبويب النظام المحاسبي - يظهر للمصرح لهم فقط */}
            {hasPermission("view_dashboard") && (
              <TabsTrigger
                value="accounting"
                className="gap-2"
                onClick={() => {
                  window.location.href = "/dashboard/accounting";
                }}
              >
                <Calculator className="h-4 w-4" />
                النظام المحاسبي
              </TabsTrigger>
            )}
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>منتجاتي ({products.length})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                  <Button
                    onClick={openNewProduct}
                    className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة منتج
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-8 w-8 animate-spin text-[var(--gold)]" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-[var(--muted-foreground)] mb-4">
                      لا توجد منتجات حالياً
                    </p>
                    <Button
                      onClick={openNewProduct}
                      className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة منتج جديد
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-lg shadow-md overflow-hidden border"
                        >
                          <div className="relative aspect-square">
                            <img
                              src={product.mainImage}
                              alt={product.nameAr}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                              {product.isFeatured && (
                                <Badge className="bg-[var(--gold)]">
                                  <Star className="h-3 w-3 ml-1" />
                                  مميز
                                </Badge>
                              )}
                              {!product.isActive && (
                                <Badge className="bg-gray-500">غير نشط</Badge>
                              )}
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold line-clamp-1">
                              {product.nameAr}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {product.category?.nameAr || "بدون تصنيف"}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-[var(--gold-dark)]">
                                {formatCurrency(product.price)}
                              </span>
                              <Badge variant="outline">
                                المخزون: {product.stock}
                              </Badge>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => openEditProduct(product)}
                              >
                                <Edit className="h-4 w-4 ml-1" />
                                تعديل
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {/* <div className="space-y-6"> */}

            {/* --- 1. أزرار التبديل بين طلبياتي وطلبات المتجر (الخطوة الثالثة) --- */}
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg w-fit border shadow-sm">
              <Button
                variant={orderSubTab === "my-orders" ? "default" : "ghost"}
                onClick={() => setOrderSubTab("my-orders")}
                className={
                  orderSubTab === "my-orders"
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "text-gray-600"
                }
                size="sm"
              >
                <Package className="h-4 w-4 ml-2" />
                طلبياتي الخاصة
              </Button>
              <Button
                variant={orderSubTab === "store-orders" ? "default" : "ghost"}
                onClick={() => setOrderSubTab("store-orders")}
                className={
                  orderSubTab === "store-orders"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-gray-600"
                }
                size="sm"
              >
                <Store className="h-4 w-4 ml-2" />
                طلبات المتجر (للمساعدة)
                {storeOrders.length > 0 && (
                  <Badge className="mr-2 bg-red-500 text-white">
                    {storeOrders.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* --- 2. عرض طلبات المتجر (ستكون مخفية حتى يضغط المندوب على الزر) --- */}
            <div
              className={orderSubTab === "store-orders" ? "block" : "hidden"}
            >
              {/* سيتم وضع جدول الإدارة الفخم هنا في الخطوة الرابعة */}
              <Card className="border-0 shadow-lg mt-4 overflow-hidden">
                <CardHeader className="bg-blue-50/50 pb-4 border-b">
                  <CardTitle className="text-blue-900 flex items-center gap-2 text-lg">
                    <Store className="h-5 w-5 text-blue-600" />
                    طلبات المتجر المتاحة للمساعدة ({storeOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full bg-white">
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
                      <Table className="min-w-[900px]">
                        <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="w-[90px]">
                              رقم الطلب
                            </TableHead>
                            <TableHead className="w-[150px]">العميل</TableHead>
                            <TableHead className="w-[280px]">
                              المنتجات
                            </TableHead>
                            <TableHead className="w-[120px]">الحالة</TableHead>
                            <TableHead className="w-[120px]">المبلغ</TableHead>
                            <TableHead className="text-left w-[140px]">
                              إجراءات
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {storeOrders.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="h-32 text-center text-gray-500"
                              >
                                <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                لا توجد طلبات إضافية في المتجر حالياً.
                              </TableCell>
                            </TableRow>
                          ) : (
                            storeOrders.map((order) => (
                              <TableRow
                                key={order.id}
                                className="hover:bg-blue-50/30 transition-colors"
                              >
                                <TableCell className="font-mono text-[11px] font-bold text-gray-600">
                                  #{order.id.slice(-6)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm">
                                      {order.customer?.name}
                                    </span>
                                    <span
                                      className="text-[10px] text-gray-500"
                                      dir="ltr"
                                    >
                                      {order.customer?.phone}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1 max-w-[280px]">
                                    {order.items?.map(
                                      (item: any, i: number) => (
                                        <div
                                          key={i}
                                          className="bg-gray-50 px-2 py-1 rounded border border-gray-100 text-xs flex justify-between items-center"
                                        >
                                          <span className="font-bold text-gray-800 truncate pr-2">
                                            {item.product?.nameAr ||
                                              "منتج محذوف"}
                                          </span>
                                          <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-1 py-0 text-[10px]">
                                            x{item.quantity}
                                          </Badge>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(order.status)}
                                </TableCell>
                                <TableCell className="font-bold text-blue-700">
                                  {formatCurrency(order.totalAmount)}
                                </TableCell>
                                <TableCell className="text-left">
                                  <div className="flex items-center gap-2">
                                    {/* زر الأكشن الأساسي: استلام أو حالة التجهيز */}
                                    {order.status === "PENDING" ? (
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md flex-1"
                                        onClick={() =>
                                          handleClaimOrder(order.id)
                                        }
                                      >
                                        <CheckCircle className="h-4 w-4 ml-1" />{" "}
                                        استلام
                                      </Button>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-orange-50 text-orange-700 border-orange-200 flex-1 justify-center h-9"
                                      >
                                        قيد التجهيز
                                      </Badge>
                                    )}

                                    {/* زر المعاينة (العين) - ظاهر دائماً للجميع */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-9 w-9 p-0 shrink-0 border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all"
                                      onClick={() => setSelectedOrder(order)}
                                      title="عرض تفاصيل الطلب قبل الاستلام"
                                    >
                                      <Eye className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* --- 3. عرض طلبياتي (الكود القديم محمي ومغلف داخل هذا الـ div الجديد) --- */}
            <div
              className={`space-y-6 ${orderSubTab === "my-orders" ? "block" : "hidden"}`}
            >
              {/* Pending Orders */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>الطلبات ({orders.length})</CardTitle>
                  <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-[var(--muted-foreground)]">
                      <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p>لا توجد طلبات حالياً</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="p-4 bg-white rounded-lg shadow border"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-mono text-sm text-gray-500">
                                  #{order.id.slice(-8)}
                                </p>
                                <p className="font-bold">
                                  {order.customer.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {order.customer.phone}
                                </p>
                              </div>
                              {getStatusBadge(order.status)}
                            </div>

                            <div className="text-sm text-gray-600 mb-3">
                              <p>
                                <MapPin className="h-3 w-3 inline ml-1" />
                                {order.governorate || "غير محدد"} -{" "}
                                {order.address}
                              </p>
                              <p>
                                <DollarSign className="h-3 w-3 inline ml-1" />
                                {formatCurrency(order.totalAmount)}
                              </p>
                            </div>

                            {/* Order Items */}
                            <div className="border-t pt-3 mb-3">
                              <p className="text-xs text-gray-500 mb-2">
                                المنتجات:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {order.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded"
                                  >
                                    <span>{item.product.nameAr}</span>
                                    <span className="text-gray-400">
                                      x{item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Payment Info */}
                            {order.paymentMethod && (
                              <div className="text-xs bg-blue-50 p-2 rounded mb-3">
                                <p>
                                  <strong>الدفع:</strong>{" "}
                                  {order.paymentMethod === "transfer"
                                    ? "حوالة"
                                    : "محفظة"}
                                </p>
                                {order.paymentDetails && (
                                  <p className="text-gray-600">
                                    {order.paymentDetails}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap mt-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="bg-[var(--gold)]/10 text-[var(--gold-dark)] hover:bg-[var(--gold)]/20"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4 ml-1" />
                                التفاصيل
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openWhatsApp(
                                    order.customer.phone,
                                    `مرحباً ${order.customer.name}، بخصوص طلبك #${order.id.slice(-8)}`,
                                  )
                                }
                              >
                                <Phone className="h-4 w-4 ml-1" />
                                واتساب
                              </Button>

                              {order.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600"
                                  onClick={() =>
                                    handleUpdateOrderStatus(
                                      order.id,
                                      "PROCESSING",
                                    )
                                  }
                                >
                                  بدء التجهيز
                                </Button>
                              )}

                              {order.status === "PROCESSING" && (
                                <Button
                                  size="sm"
                                  className="bg-purple-500 hover:bg-purple-600"
                                  onClick={() =>
                                    handleUpdateOrderStatus(order.id, "SHIPPED")
                                  }
                                >
                                  تم الشحن
                                </Button>
                              )}

                              {order.status === "SHIPPED" && (
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() =>
                                    handleUpdateOrderStatus(
                                      order.id,
                                      "COMPLETED",
                                    )
                                  }
                                >
                                  تم التسليم
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Completed Orders */}
              {completedOrders.length > 0 && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-green-600">
                      طلبات منجزة ({completedOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {completedOrders.map((order) => (
                          <div
                            key={order.id}
                            className="p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono text-sm text-gray-500">
                                  #{order.id.slice(-8)}
                                </p>
                                <p className="font-medium">
                                  {order.customer.name}
                                </p>
                              </div>
                              <div className="text-left">
                                <Badge className="bg-green-500">منجز</Badge>
                                <p className="font-bold text-green-700 mt-1">
                                  {formatCurrency(order.totalAmount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab (Inbox) */}
          <TabsContent value="messages">
            {/* استدعاء صندوق الوارد الخاص بالمندوب وتمرير الـ ID الخاص به */}
            <AgentInbox agentId={user.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* نافذة تفاصيل الطلب للمندوبة (جديد) */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center border-b pb-2">
              <span>تفاصيل الطلب #{selectedOrder?.id.slice(-8)}</span>
              {getStatusBadge(selectedOrder?.status || "")}
            </DialogTitle>
            {/* السطر الجديد المضاف أدناه */}
            <DialogDescription className="sr-only">
              عرض تفاصيل المنتجات وبيانات العميل للطلب المختار.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5 text-sm text-gray-800 mt-2">
              {/* بيانات العميل والموقع */}
              <div className="space-y-2">
                <p className="font-bold text-lg text-[var(--gold-dark)]">
                  👤 بيانات التوصيل:
                </p>
                <div className="pr-2 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {(() => {
                    let extraData: any = {};
                    try {
                      extraData =
                        typeof selectedOrder.paymentDetails === "string"
                          ? JSON.parse(selectedOrder.paymentDetails)
                          : selectedOrder.paymentDetails || {};
                    } catch (e) {}
                    return (
                      <>
                        <p>
                          •{" "}
                          <span className="font-medium text-gray-700">
                            العميل:
                          </span>{" "}
                          {selectedOrder.customer.name}
                        </p>
                        {extraData.customerName &&
                          extraData.customerName !==
                            selectedOrder.customer.name && (
                            <p className="text-blue-700 font-bold bg-blue-50 p-1.5 rounded mt-1 w-fit border border-blue-100">
                              🎁 المستلم: {extraData.customerName}
                            </p>
                          )}
                        <p>
                          • <span className="font-medium">الجوال:</span>{" "}
                          <span dir="ltr">
                            {selectedOrder.phone ||
                              selectedOrder.customer.phone}
                          </span>
                        </p>
                        <p>
                          • <span className="font-medium">المحافظة:</span>{" "}
                          {selectedOrder.governorate}
                        </p>
                        <p>
                          • <span className="font-medium">العنوان:</span>{" "}
                          {selectedOrder.address}
                        </p>
                        <p className="mt-2 pt-2 border-t border-gray-200">
                          📍 <span className="font-medium">الموقع:</span>{" "}
                          {extraData.locationLink ? (
                            <a
                              href={extraData.locationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline font-bold hover:text-blue-800"
                            >
                              فتح الخريطة (Google Maps)
                            </a>
                          ) : (
                            <span className="text-gray-400">لم يرفق</span>
                          )}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* المنتجات المطلوبة */}
              <div className="space-y-2">
                <p className="font-bold text-lg text-[var(--gold-dark)]">
                  📦 المنتجات:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm"
                    >
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-100 shrink-0">
                        {item.product?.mainImage ? (
                          <img
                            src={item.product.mainImage}
                            alt="product"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-gray-300 m-auto mt-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">
                          {item.product?.nameAr || "منتج غير متاح"}
                        </p>
                        <div className="text-xs text-gray-600 mt-1 space-y-1">
                          <p>
                            🔹 العدد: {item.quantity} | السعر:{" "}
                            {formatCurrency(item.price)}
                          </p>
                          {item.color && (
                            <p className="text-xs text-purple-600 font-bold mt-1">
                              🎨 اللون: {item.color}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left pr-2 flex items-center">
                        <p className="font-bold text-sm text-[var(--gold-dark)]">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* بيانات الدفع والملاحظات (النسخة الكاملة مع الإغلاق) */}
              <div className="space-y-2">
                <p className="font-bold text-lg text-[var(--gold-dark)]">
                  💳 الدفع والملاحظات:
                </p>
                <div className="pr-2 bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-3">
                  {/* إجمالي قيمة الطلب */}
                  <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                    <span className="font-medium text-blue-900">
                      إجمالي قيمة الطلب:
                    </span>
                    <span className="font-bold text-lg text-[var(--gold-dark)]">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>

                  {/* المبلغ المطلوب تحصيله */}
                  <div className="bg-white/50 p-2 rounded-md border border-blue-100">
                    <p>
                      🔹{" "}
                      <span className="font-medium text-gray-700">
                        المطلوب تحصيله من العميل:
                      </span>{" "}
                      <span className="font-bold text-red-600">
                        {selectedOrder.paymentMethod === "transfer" ||
                        selectedOrder.paymentMethod === "wallet"
                          ? "0 ر.ي (مدفوع مسبقاً)"
                          : formatCurrency(selectedOrder.totalAmount)}
                      </span>
                    </p>
                  </div>

                  {/* زر عرض إثبات الدفع */}
                  {(() => {
                    let pData: any = {};
                    try {
                      pData =
                        typeof selectedOrder.paymentDetails === "string"
                          ? JSON.parse(selectedOrder.paymentDetails)
                          : selectedOrder.paymentDetails || {};
                    } catch (e) {}

                    if (pData.proofImage) {
                      return (
                        <div className="pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() =>
                              window.open(pData.proofImage, "_blank")
                            }
                          >
                            <Eye className="h-4 w-4 ml-2" />
                            فتح صورة إثبات الدفع من السحابة
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* الملاحظات */}
                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-gray-700">
                      📝 <span className="font-medium">ملاحظات العميل:</span>{" "}
                      <span className="italic">
                        {(selectedOrder as any).notes || "لا يوجد"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div> // إغلاق الـ div الأساسي للبيانات
          )}
        </DialogContent>
      </Dialog>
      {/* Product Form Dialog (النافذة الجديدة المستقلة) */}
      <ProductFormDialog
        isOpen={isProductDialogOpen}
        onClose={() => {
          setIsProductDialogOpen(false);
          setSelectedProduct(null);
        }}
        categories={categories}
        selectedProduct={selectedProduct}
        userId={user.id}
        isSaving={isSaving}
        onSave={handleSaveProduct}
      />

      {/* Chat Widget */}
      <ChatWidget userId={user.id} userName={user.name} userRole={user.role} />

      {/* Delivery Fees Dialog (نافذة رسوم التوصيل للمندوبة) */}
      <Dialog
        open={isDeliveryDialogOpen}
        onOpenChange={setIsDeliveryDialogOpen}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 font-bold text-xl">
              <MapPin className="h-6 w-6" />
              دليل رسوم التوصيل
            </DialogTitle>
            {/* تم استبدال وسم الـ p بوسم DialogDescription لحل مشكلة التحذير */}
            <DialogDescription className="text-sm text-[var(--muted-foreground)]">
              تسعيرة الشحن المعتمدة لكل محافظة لتوضيحها لعملائك.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mt-2 pb-2">
            {isLoadingDelivery ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-purple-500">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">جاري تحميل التسعيرة...</p>
              </div>
            ) : governorates.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>لم تقم الإدارة بتحديد رسوم التوصيل بعد.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {governorates.map((gov, index) => (
                  <div
                    key={gov.id || index}
                    className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-purple-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg border border-purple-100">
                        {gov.nameAr.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-800">
                        {gov.nameAr}
                      </span>
                    </div>
                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                      <span className="font-bold text-green-700 text-sm">
                        {gov.deliveryFee === 0
                          ? "توصيل مجاني"
                          : `${gov.deliveryFee.toLocaleString("ar-YE")} ر.ي`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 border-t mt-auto">
            <Button
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl"
              onClick={() => setIsDeliveryDialogOpen(false)}
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
