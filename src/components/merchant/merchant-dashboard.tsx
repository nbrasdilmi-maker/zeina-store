"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NotificationBell } from "../layout/notification-bell";
import { pusherClient } from "@/lib/pusher";
import {
  ShoppingBag,
  Package,
  DollarSign,
  Settings,
  LogOut,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Star,
  Tag,
  Save,
  Home,
  Upload,
  Store,
  Wallet,
  Percent,
  BarChart3,
  UserCircle,
  MessageSquare,
  MapPin,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { toast } from "@/hooks/use-toast";
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
import { uploadImage } from "@/lib/upload";
import { useAccounting } from "@/contexts/accounting-context";
import { ProductFormDialog } from "@/components/shared/product-form-dialog";

import { AgentInbox } from "@/components/chat/agent-inbox";

interface MerchantDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    merchantId?: string;
  };
  onLogout: () => void;
  onViewStore?: () => void;
}

interface MerchantStats {
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  totalCommission: number;
  netProfit: number;
  pendingOrders: number;
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
  sku?: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: Category;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  paymentDetails?: any;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    product: {
      name: string;
      nameAr: string;
      mainImage?: string;
    };
    quantity: number;
    price: number;
    color?: string;
  }>;
}

interface MerchantInfo {
  id: string;
  storeName: string;
  storeType: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  jeibWallet: string | null;
  kashWallet: string | null;
  jawaliWallet: string | null;
  transferInfo: string | null;
  commissionAmount: number;
  totalSales: number;
  totalCommission: number;
  isApproved: boolean;
}

export function MerchantDashboard({
  user,
  onLogout,
  onViewStore,
}: MerchantDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Product dialog state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const { hasPermission } = useAccounting();

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    jeibWallet: "",
    kashWallet: "",
    jawaliWallet: "",
    transferInfo: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  // Delivery Fees state (نافذة رسوم التوصيل)
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [governorates, setGovernorates] = useState<any[]>([]);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);

  // Profile & Account Dialog state (جديد)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    jeibWallet: "",
    kashWallet: "",
    jawaliWallet: "",
    transferInfo: "",
  });

  // Fetch initial data
  useEffect(() => {
    fetchStats();
    fetchCategories();
    fetchMerchantInfo();
  }, []);
  // ⚡ التحديث اللحظي للتاجر: استماع للإشعارات وتحديث البيانات
  useEffect(() => {
    if (!pusherClient || !user?.id) return;

    const channel = pusherClient.subscribe(`user-${user.id}`);

    channel.bind("new-notification", () => {
      // 1. تحديث الإحصائيات العلوية دائماً
      fetchStats();

      // 2. تحديث التبويب المفتوح حالياً فقط
      if (activeTab === "products") fetchProducts();
      if (activeTab === "orders") fetchOrders();
    });

    return () => {
      pusherClient.unsubscribe(`user-${user.id}`);
    };
  }, [user?.id, activeTab]); // يتفاعل مع تغير التبويب

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/merchant/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Fetch stats error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMerchantInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/merchant/info", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (data.success && data.merchant) {
        setMerchantInfo(data.merchant);
        const paymentData = {
          jeibWallet: data.merchant.jeibWallet || "",
          kashWallet: data.merchant.kashWallet || "",
          jawaliWallet: data.merchant.jawaliWallet || "",
          transferInfo: data.merchant.transferInfo || "",
        };
        setSettingsForm(paymentData);
        setProfileForm({
          fullName: data.merchant.fullName || "",
          phone: data.merchant.phone || "",
          email: data.merchant.email || "",
          address: data.merchant.address || "",
          ...paymentData,
        });
      }
    } catch (error) {
      console.error("Fetch merchant info error:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Fetch categories error:", error);
      setCategories([
        { id: "perfumes", name: "Perfumes", nameAr: "عطور", slug: "perfumes" },
        { id: "makeup", name: "Makeup", nameAr: "مكياج", slug: "makeup" },
        {
          id: "accessories",
          name: "Accessories",
          nameAr: "أكسسوارات",
          slug: "accessories",
        },
        { id: "skincare", name: "Skincare", nameAr: "عناية", slug: "skincare" },
      ]);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/merchant/products", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Fetch products error:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/merchant/orders", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Fetch orders error:", error);
    }
  };
  // دالة فتح نافذة التوصيل وجلب البيانات
  const openDeliveryDialog = async () => {
    setIsDeliveryDialogOpen(true);
    if (governorates.length > 0) return; // إذا قد جلبناها مسبقاً لا تعيد التحميل

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
  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "products" && products.length === 0) {
      fetchProducts();
    }
    if (activeTab === "orders" && orders.length === 0) {
      fetchOrders();
    }
  }, [activeTab, products.length, orders.length]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-YE")} ر.ي`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  // Product functions
  const openNewProduct = () => {
    setSelectedProduct(null);
    setIsProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async (productData: any) => {
    setIsSavingProduct(true);
    try {
      const token = localStorage.getItem("token");
      const url = "/api/merchant/products";
      const method = selectedProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        fetchProducts();
        fetchStats();
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
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/merchant/products?productId=${productId}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم",
          description: "تم حذف المنتج",
        });
        fetchProducts();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/merchant/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: product.id,
          isFeatured: !product.isFeatured,
        }),
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: product.isFeatured
            ? "تم إزالة المنتج من المميزة"
            : "تم إضافة المنتج للمميزة",
        });
        fetchProducts();
      }
    } catch (error) {
      console.error("Toggle featured error:", error);
    }
  };

  // Settings functions
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/merchant/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settingsForm),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم",
          description: "تم حفظ الإعدادات بنجاح",
        });
        fetchMerchantInfo();
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
      setIsSavingSettings(false);
    }
  };

  // Profile & Account functions (جديد)
  const handleSaveProfile = async () => {
    setIsProfileSaving(true);
    try {
      const token = localStorage.getItem("token");

      // تحديث البيانات الشخصية وبيانات الدفع معاً
      const response = await fetch("/api/merchant/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: profileForm.fullName,
          phone: profileForm.phone,
          email: profileForm.email,
          address: profileForm.address,
          jeibWallet: profileForm.jeibWallet,
          kashWallet: profileForm.kashWallet,
          jawaliWallet: profileForm.jawaliWallet,
          transferInfo: profileForm.transferInfo,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم التحديث",
          description: "تم حفظ بيانات الحساب وطرق الدفع بنجاح",
        });
        setIsProfileDialogOpen(false);
        fetchMerchantInfo();
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ أثناء التحديث",
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
      setIsProfileSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-[var(--border)] sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img
                src="/zeina-logo-header.png"
                alt="زينة"
                className="h-10 w-auto object-contain"
              />
              <Badge className="bg-purple-500">لوحة التاجر</Badge>
            </div>

            <div className="flex items-center gap-4">
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

              <NotificationBell userId={user.id} />

              <Button
                variant="ghost"
                className="flex items-center gap-2 p-1 h-auto hover:bg-gray-100 rounded-full"
                onClick={() => setIsProfileDialogOpen(true)}
              >
                <Avatar>
                  <AvatarFallback className="bg-purple-500 text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    حسابي
                  </p>
                </div>
              </Button>

              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-1 mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              منتجاتي
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              الطلبات
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-2">
              <DollarSign className="h-4 w-4" />
              الأرباح
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثات
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات
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

          {/* Overview Tab */}
          <TabsContent value="overview">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Welcome Card */}
                <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">
                          مرحباً، {user.name}! 🎉
                        </h2>
                        <p className="opacity-90 mt-1">
                          {merchantInfo?.storeName || "متجرك"} -{" "}
                          {merchantInfo?.storeType || ""}
                        </p>
                      </div>
                      <Store className="h-16 w-16 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              منتجاتي
                            </p>
                            <p className="text-3xl font-bold mt-1">
                              {stats?.totalProducts || 0}
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              إجمالي الطلبات
                            </p>
                            <p className="text-3xl font-bold mt-1">
                              {stats?.totalOrders || 0}
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              {stats?.pendingOrders || 0} قيد الانتظار
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              إجمالي المبيعات
                            </p>
                            <p className="text-3xl font-bold mt-1">
                              {formatCurrency(stats?.totalSales || 0)}
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              صافي الربح
                            </p>
                            <p className="text-3xl font-bold mt-1 text-green-600">
                              {formatCurrency(stats?.netProfit || 0)}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              بعد خصم العمولة
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-[var(--gold)]" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Commission Info */}
                <Card className="border-0 shadow-lg border-2 border-purple-200">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="h-5 w-5 text-purple-500" />
                      معلومات العمولة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          نسبة العمولة
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {merchantInfo?.commissionAmount || 0}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          إجمالي العمولات
                        </p>
                        <p className="text-2xl font-bold text-red-500">
                          {formatCurrency(stats?.totalCommission || 0)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          صافي أرباحك
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(stats?.netProfit || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>إجراءات سريعة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={openNewProduct}
                      >
                        <Plus className="h-6 w-6" />
                        <span>إضافة منتج</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("products")}
                      >
                        <ShoppingBag className="h-6 w-6" />
                        <span>إدارة المنتجات</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("orders")}
                      >
                        <Package className="h-6 w-6" />
                        <span>عرض الطلبات</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-purple-200 hover:bg-purple-50 text-purple-700 shadow-sm"
                        onClick={openDeliveryDialog}
                      >
                        <MapPin className="h-6 w-6" />
                        <span>رسوم التوصيل</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>منتجاتي ({products.length})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={fetchProducts} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                  <Button
                    onClick={openNewProduct}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة منتج
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-[var(--muted-foreground)] mb-4">
                      لا توجد منتجات حالياً
                    </p>
                    <Button
                      onClick={openNewProduct}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة منتج جديد
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
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
                              {product.originalPrice &&
                                product.originalPrice > product.price && (
                                  <Badge className="bg-[var(--rose)]">
                                    -
                                    {Math.round(
                                      (1 -
                                        product.price / product.originalPrice) *
                                        100,
                                    )}
                                    %
                                  </Badge>
                                )}
                            </div>
                            <div className="absolute top-2 left-2 flex gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleFeatured(product)}
                              >
                                <Star
                                  className={`h-4 w-4 ${product.isFeatured ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`}
                                />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-[var(--muted-foreground)] mb-1">
                              {product.category?.nameAr || "بدون تصنيف"}
                            </p>
                            <h3 className="font-semibold text-sm line-clamp-1">
                              {product.nameAr}
                            </h3>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--gold-dark)]">
                                  {product.price.toLocaleString()} ر.ي
                                </span>
                                {product.originalPrice &&
                                  product.originalPrice > product.price && (
                                    <span className="text-xs text-gray-400 line-through">
                                      {product.originalPrice.toLocaleString()}
                                    </span>
                                  )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                المخزون: {product.stock}
                              </Badge>
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
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>طلبات منتجاتي</CardTitle>
                <Button onClick={fetchOrders} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-[var(--muted-foreground)]">
                      لا توجد طلبات حالياً
                    </p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto h-[600px] overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم الطلب</TableHead>
                          <TableHead>العميلة</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono">
                              #{order.id.slice(-6)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {order.customer.name}
                                </p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {order.customer.phone}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          إجمالي المبيعات
                        </p>
                        <p className="text-3xl font-bold mt-1">
                          {formatCurrency(stats?.totalSales || 0)}
                        </p>
                      </div>
                      <DollarSign className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          العمولات المدفوعة
                        </p>
                        <p className="text-3xl font-bold mt-1 text-red-500">
                          {formatCurrency(stats?.totalCommission || 0)}
                        </p>
                      </div>
                      <Percent className="h-10 w-10 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg border-2 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          صافي أرباحك
                        </p>
                        <p className="text-3xl font-bold mt-1 text-green-600">
                          {formatCurrency(stats?.netProfit || 0)}
                        </p>
                      </div>
                      <BarChart3 className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Info */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-purple-500" />
                    بيانات الدفع الخاصة بك
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {merchantInfo?.jeibWallet && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          محفظة جيب
                        </p>
                        <p className="font-bold">{merchantInfo.jeibWallet}</p>
                      </div>
                    )}
                    {merchantInfo?.kashWallet && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          محفظة كاش
                        </p>
                        <p className="font-bold">{merchantInfo.kashWallet}</p>
                      </div>
                    )}
                    {merchantInfo?.jawaliWallet && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          محفظة جوالي
                        </p>
                        <p className="font-bold">{merchantInfo.jawaliWallet}</p>
                      </div>
                    )}
                    {merchantInfo?.transferInfo && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          معلومات الحوالة
                        </p>
                        <p className="font-bold">{merchantInfo.transferInfo}</p>
                      </div>
                    )}
                    {!merchantInfo?.jeibWallet &&
                      !merchantInfo?.kashWallet &&
                      !merchantInfo?.jawaliWallet &&
                      !merchantInfo?.transferInfo && (
                        <div className="col-span-2 text-center py-8 text-[var(--muted-foreground)]">
                          <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>لم يتم إضافة بيانات دفع</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setIsProfileDialogOpen(true)}
                          >
                            إضافة بيانات الدفع
                          </Button>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Messages Tab (Inbox) */}
          <TabsContent value="messages">
            <AgentInbox agentId={user.id} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  إعدادات المتجر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Store Info */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-bold mb-3">معلومات المتجر</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          اسم المحل
                        </p>
                        <p className="font-medium">{merchantInfo?.storeName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          نوع المنتجات
                        </p>
                        <p className="font-medium">{merchantInfo?.storeType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          الاسم الكامل
                        </p>
                        <p className="font-medium">{merchantInfo?.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          رقم الجوال
                        </p>
                        <p className="font-medium" dir="ltr">
                          {merchantInfo?.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Access to Edit Profile */}
                  <div className="flex flex-col sm:flex-row gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex-1">
                      <h3 className="font-bold text-purple-700">
                        تعديل بيانات الحساب والدفع
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        قم بتحديث بياناتك الشخصية أو طرق استلام الأرباح
                      </p>
                    </div>
                    <Button
                      className="bg-purple-500 hover:bg-purple-600 h-fit"
                      onClick={() => setIsProfileDialogOpen(true)}
                    >
                      <UserCircle className="h-4 w-4 ml-2" />
                      تعديل الآن
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Dialog - النسخة النهائية الشاملة */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-x-auto overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center border-b pb-2">
              <span>تفاصيل الطلب #{selectedOrder?.id.slice(-8)}</span>
              {getStatusBadge(selectedOrder?.status || "")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              عرض تفاصيل الطلبية المحددة
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* 1. بيانات العميل والتوصيل (شاملة المستلم والموقع) */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2 border border-gray-100">
                <p className="font-bold text-sm text-purple-700 border-b pb-1 mb-2">
                  👤 بيانات العميل والتوصيل
                </p>
                {(() => {
                  let extraData: any = {};
                  try {
                    extraData =
                      typeof selectedOrder.paymentDetails === "string"
                        ? JSON.parse(selectedOrder.paymentDetails)
                        : selectedOrder.paymentDetails || {};
                  } catch (e) {}
                  return (
                    <div className="text-sm space-y-2">
                      <p>
                        <span className="font-medium text-gray-800">
                          صاحب الحساب:
                        </span>{" "}
                        {selectedOrder.customer.name}
                      </p>

                      {/* إظهار اسم المستلم (علي بشنة مثلاً) */}
                      {extraData.customerName &&
                        extraData.customerName !==
                          selectedOrder.customer.name && (
                          <p className="text-blue-700 font-bold bg-blue-50 p-1.5 rounded">
                            🎁 المستلم للطلب: {extraData.customerName}
                          </p>
                        )}

                      <p>
                        <span className="font-medium text-gray-800">
                          الجوال:
                        </span>{" "}
                        <span dir="ltr">{selectedOrder.customer.phone}</span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">
                          العنوان:
                        </span>{" "}
                        {selectedOrder.customer.address}
                      </p>

                      {/* رابط الموقع الجغرافي */}
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="flex items-center gap-2">
                          📍{" "}
                          <span className="font-medium text-gray-800">
                            الموقع:
                          </span>
                          {extraData.locationLink ? (
                            <a
                              href={extraData.locationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline font-bold hover:text-blue-800"
                            >
                              فتح في خرائط جوجل
                            </a>
                          ) : (
                            <span className="text-gray-400 italic text-xs">
                              لم يتم مشاركة الموقع
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. المنتجات المطلوبة (شاملة الصور والألوان) */}
              <div className="space-y-2">
                <p className="font-bold text-sm text-gray-700 px-1">
                  📦 المنتجات المطلوبة
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
                    >
                      {/* صورة المنتج من السحابة */}
                      <div className="w-16 h-16 rounded-md overflow-hidden border border-gray-100 shrink-0 bg-gray-50 flex items-center justify-center">
                        {(item.product as any)?.mainImage ? (
                          <img
                            src={(item.product as any).mainImage}
                            alt={item.product?.nameAr}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-bold text-sm text-gray-900">
                          {item.product?.nameAr || "منتج غير متاح"}
                        </p>
                        <div className="text-xs text-gray-600 mt-1 space-y-1">
                          <p>
                            🔹 العدد: {item.quantity} | السعر:{" "}
                            {item.price.toLocaleString()} ر.ي
                          </p>
                          {/* اللون المختار */}
                          {(item as any).color && (
                            <p className="text-purple-600 font-medium">
                              🎨 اللون: {(item as any).color}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-sm text-purple-700">
                          {(item.price * item.quantity).toLocaleString()} ر.ي
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. بيانات الدفع وإثبات التحويل (طلبك الأساسي) */}
              <div className="space-y-2">
                <p className="font-bold text-sm text-gray-700 px-1">
                  💳 بيانات الدفع والتحقق
                </p>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 space-y-3">
                  {(() => {
                    let pData: any = {};
                    try {
                      pData =
                        typeof selectedOrder.paymentDetails === "string"
                          ? JSON.parse(selectedOrder.paymentDetails)
                          : selectedOrder.paymentDetails || {};
                    } catch (e) {}

                    return (
                      <div className="text-sm space-y-2">
                        <p>
                          🔹{" "}
                          <span className="font-medium text-orange-900">
                            طريقة الدفع:
                          </span>{" "}
                          {selectedOrder.paymentMethod === "transfer"
                            ? "حوالة صرافة"
                            : "محفظة إلكترونية"}
                        </p>

                        {pData.wallet && (
                          <p>
                            🏦{" "}
                            <span className="font-medium text-orange-900">
                              المحفظة:
                            </span>{" "}
                            {pData.wallet === "jeib"
                              ? "جيب"
                              : pData.wallet === "kash"
                                ? "كاش"
                                : "جوالي"}
                          </p>
                        )}

                        {pData.transferNumber && (
                          <p>
                            🔢{" "}
                            <span className="font-medium text-orange-900">
                              رقم الحوالة:
                            </span>{" "}
                            <span className="font-bold text-blue-700">
                              {pData.transferNumber}
                            </span>
                          </p>
                        )}

                        {/* زر فتح صورة إثبات الدفع السحابية (ImageKit) */}
                        {pData.proofImage && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 bg-white border-orange-300 text-orange-700 hover:bg-orange-100 font-bold"
                            onClick={() =>
                              window.open(pData.proofImage, "_blank")
                            }
                          >
                            <ImageIcon className="h-4 w-4 ml-2" />
                            فتح صورة إثبات الدفع من السحابة
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 4. ملاحظات ومجموع نهائي */}
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs text-gray-600 italic">
                  📝 ملاحظات: {(selectedOrder as any).notes || "لا يوجد"}
                </p>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span className="text-gray-700">المجموع الكلي:</span>
                  <span className="text-purple-700">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
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
        isSaving={isSavingProduct}
        onSave={handleSaveProduct}
      />

      {/* Profile & Account Dialog (جديد) */}
      <Dialog
        open={isProfileDialogOpen}
        onOpenChange={(open) => {
          setIsProfileDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-x-auto overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-6 w-6 text-purple-500" />
              تعديل بيانات الحساب والدفع
            </DialogTitle>
            <DialogDescription className="sr-only">
              تعديل البيانات الشخصية وطرق استلام الأرباح
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Personal Info Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-bold text-gray-700 border-b pb-2">
                البيانات الشخصية
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        fullName: e.target.value,
                      })
                    }
                    placeholder="الاسم الرباعي"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الجوال *</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    placeholder="+967XXXXXXXXX"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    placeholder="example@email.com"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>العنوان</Label>
                  <Input
                    value={profileForm.address}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        address: e.target.value,
                      })
                    }
                    placeholder="المدينة، الحي، الشارع"
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods Section */}
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-bold text-purple-700 border-b border-purple-200 pb-2">
                طرق استلام الأرباح (بيانات الدفع)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>محفظة جيب</Label>
                  <Input
                    value={profileForm.jeibWallet}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        jeibWallet: e.target.value,
                      })
                    }
                    placeholder="رقم محفظة جيب"
                  />
                </div>
                <div className="space-y-2">
                  <Label>محفظة كاش</Label>
                  <Input
                    value={profileForm.kashWallet}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        kashWallet: e.target.value,
                      })
                    }
                    placeholder="رقم محفظة كاش"
                  />
                </div>
                <div className="space-y-2">
                  <Label>محفظة جوالي</Label>
                  <Input
                    value={profileForm.jawaliWallet}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        jawaliWallet: e.target.value,
                      })
                    }
                    placeholder="رقم محفظة جوالي"
                  />
                </div>
                <div className="space-y-2">
                  <Label>معلومات الحوالة البنكية</Label>
                  <Input
                    value={profileForm.transferInfo}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        transferInfo: e.target.value,
                      })
                    }
                    placeholder="اسم البنك، رقم الحساب، الاسم"
                  />
                </div>
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsProfileDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                onClick={handleSaveProfile}
                disabled={isProfileSaving}
              >
                {isProfileSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Fees Dialog (نافذة رسوم التوصيل) */}
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
