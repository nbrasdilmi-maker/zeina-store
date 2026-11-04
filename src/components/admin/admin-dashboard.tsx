"use client";

import { useState, useEffect } from "react";
import { AdminOrdersTab } from "./admin-orders-tab";
import { AdminUsersTab } from "./admin-users-tab";
import { AdsManager } from "./ads-manager";
import { AgentInbox } from "@/components/chat/agent-inbox";
import { motion, AnimatePresence } from "framer-motion";
import { ProductsTab } from "./tabs/products-tab";
import { GovernoratesTab } from "./tabs/governorates-tab";
import { CategoriesTab } from "./tabs/categories-tab";
import { OrderDetailsDialog } from "./dialogs/order-details-dialog";
import { MerchantsTab } from "./tabs/merchants-tab";
import { NotificationBell } from "../layout/notification-bell";
import { MerchantDetailsDialog } from "./dialogs/merchant-details-dialog";
import { pusherClient } from "@/lib/pusher";
import {
  Users,
  ShoppingBag,
  Package,
  DollarSign,
  MessageSquare,
  LogOut,
  TrendingUp,
  UserCheck,
  Clock,
  CheckCircle,
  RefreshCw,
  Mail,
  Send,
  Star,
  Tag,
  Home,
  Store,
  MapPin,
  Megaphone,
  Calculator,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAccounting } from "@/contexts/accounting-context";
import { CategoryDialog } from "./dialogs/category-dialog";
import { ProductFormDialog } from "@/components/shared/product-form-dialog";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// (جميع الواجهات (interfaces) كما هي بدون تغيير... تم اختصارها هنا للحفاظ على المساحة، لكن الكود الكامل يحتويها)
// interfaces: AdminDashboardProps, Stats, User, Order, Category, Product, Merchant, Governorate, decodeHtml

interface AdminDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  onViewStore?: () => void;
}

interface Stats {
  users: { total: number; customers: number; agents: number };
  products: number;
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
  };
  revenue: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  _count: { products: number; orders: number; messages: number };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: { name: string; email: string; phone: string; address: string };
  items: Array<{
    product: { name: string; nameAr: string };
    quantity: number;
    price: number;
  }>;
  paymentMethod?: string;
  paymentDetails?: any;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
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

interface Merchant {
  id: string;
  storeName: string;
  storeType: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  identityCardImage: string;
  jeibWallet: string | null;
  kashWallet: string | null;
  jawaliWallet: string | null;
  transferInfo: string | null;
  isApproved: boolean;
  isActive: boolean;
  commissionAmount: number;
  totalSales: number;
  totalCommission: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
}

interface Governorate {
  id: string;
  name: string;
  nameAr: string;
  deliveryFee: number;
  isActive: boolean;
  createdAt: string;
}

const decodeHtml = (html: string) => {
  if (typeof window === "undefined") return html;
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

export function AdminDashboard({
  user,
  onLogout,
  onViewStore,
}: AdminDashboardProps) {
  // جميع حالات useState والدوال كما هي بدون تغيير
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameAr: "",
    slug: "",
    image: "",
  });
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantStats, setMerchantStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
  });
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(
    null,
  );
  const [isMerchantDialogOpen, setIsMerchantDialogOpen] = useState(false);
  const [merchantFilter, setMerchantFilter] = useState<
    "all" | "pending" | "approved"
  >("all");
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [govForm, setGovForm] = useState({
    name: "",
    nameAr: "",
    deliveryFee: "",
  });
  const [isSavingGov, setIsSavingGov] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const { hasPermission } = useAccounting();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // (جميع دوال useEffect و fetch كما هي بدون تغيير)
  useEffect(() => {
    fetchStats();
    fetchCategories();
  }, []);
  useEffect(() => {
    if (!pusherClient) return;
    const channel = pusherClient.subscribe(`user-${user.id}`);
    channel.bind("new-notification", () => {
      fetchStats();
      if (activeTab === "orders") fetchOrders();
      if (activeTab === "products") fetchProducts();
      if (activeTab === "merchants")
        fetchMerchants(merchantFilter === "all" ? undefined : merchantFilter);
      if (activeTab === "users") fetchUsers();
    });
    return () => {
      pusherClient.unsubscribe(`user-${user.id}`);
    };
  }, [user.id, activeTab, merchantFilter]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/stats", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (data.success) setStats(data.stats);
    } catch (error) {
      console.error("Fetch stats error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchUsers = async () => {
    /* ... بدون تغيير */ try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  };
  const fetchOrders = async () => {
    /* ... بدون تغيير */ try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/orders", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    }
  };
  const fetchCategories = async () => {
    /* ... بدون تغيير */ try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch {
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
  const fetchMerchants = async (status?: "pending" | "approved") => {
    /* ... بدون تغيير */ try {
      const token = localStorage.getItem("token");
      const url = status
        ? `/api/admin/merchants?status=${status}`
        : "/api/admin/merchants";
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setMerchants(data.merchants || []);
      setMerchantStats(data.stats || { total: 0, pending: 0, approved: 0 });
    } catch {
      setMerchants([]);
    }
  };
  const fetchGovernorates = async () => {
    /* ... بدون تغيير */ try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/governorates", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (data.success) setGovernorates(data.governorates);
    } catch {}
  };
  const handleAddGovernorate = async () => {
    /* ... بدون تغيير */ if (
      !govForm.name ||
      !govForm.nameAr ||
      !govForm.deliveryFee
    ) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }
    setIsSavingGov(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/governorates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(govForm),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "تم", description: "تم إضافة المحافظة بنجاح" });
        setGovForm({ name: "", nameAr: "", deliveryFee: "" });
        fetchGovernorates();
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsSavingGov(false);
    }
  };
  const openNewCategory = () => {
    setSelectedCategory(null);
    setCategoryForm({ name: "", nameAr: "", slug: "", image: "" });
    setIsCategoryDialogOpen(true);
  };
  const openEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      nameAr: category.nameAr,
      slug: category.slug,
      image: category.image || "",
    });
    setIsCategoryDialogOpen(true);
  };
  const resetCategoryForm = () => {
    setCategoryForm({ name: "", nameAr: "", slug: "", image: "" });
    setSelectedCategory(null);
  };
  const handleSaveCategory = async () => {
    /* ... بدون تغيير */ if (!categoryForm.name || !categoryForm.nameAr) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم التصنيف بالعربي والإنجليزي",
        variant: "destructive",
      });
      return;
    }
    setIsSavingCategory(true);
    try {
      const url = "/api/categories";
      const method = selectedCategory ? "PUT" : "POST";
      const body = selectedCategory
        ? { id: selectedCategory.id, ...categoryForm }
        : categoryForm;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "تم",
          description: selectedCategory
            ? "تم تحديث التصنيف"
            : "تم إضافة التصنيف",
        });
        setIsCategoryDialogOpen(false);
        resetCategoryForm();
        fetchCategories();
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsSavingCategory(false);
    }
  };
  const handleDeleteCategory = async (categoryId: string) => {
    /* ... بدون تغيير */ if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟"))
      return;
    try {
      const response = await fetch(`/api/categories?categoryId=${categoryId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "تم", description: "تم حذف التصنيف" });
        fetchCategories();
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ أثناء الحذف",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };
  const handleMerchantApproval = async (
    merchantId: string,
    approved: boolean,
    commissionAmount?: number,
  ) => {
    /* ... بدون تغيير */ try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/admin/merchants/${merchantId}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ approved, commissionAmount }),
        },
      );
      const data = await response.json();
      if (data.success) {
        toast({
          title: "تم",
          description: approved ? "تم تفعيل التاجر بنجاح" : "تم رفض التاجر",
        });
        fetchMerchants(merchantFilter === "all" ? undefined : merchantFilter);
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    }
  };
  const fetchProducts = async () => {
    /* ... بدون تغيير */ try {
      const response = await fetch("/api/products?all=true");
      const data = await response.json();
      setProducts(data.products || []);
    } catch {}
  };
  useEffect(() => {
    if (activeTab === "products" && products.length === 0) fetchProducts();
  }, [activeTab, products.length]);
  useEffect(() => {
    if (activeTab === "users" && users.length === 0) fetchUsers();
    if (activeTab === "orders" && orders.length === 0) fetchOrders();
    if (activeTab === "governorates" && governorates.length === 0)
      fetchGovernorates();
  }, [activeTab, users.length, orders.length, governorates.length]);
  useEffect(() => {
    if (activeTab === "merchants")
      fetchMerchants(merchantFilter === "all" ? undefined : merchantFilter);
  }, [activeTab, merchantFilter]);
  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    /* ... بدون تغيير */ try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, isActive }),
      });
      if (response.ok) {
        toast({
          title: "تم",
          description: isActive ? "تم تفعيل المستخدم" : "تم تعطيل المستخدم",
        });
        fetchUsers();
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المستخدم",
        variant: "destructive",
      });
    }
  };
  const handleUpdateRole = async (userId: string, newRole: string) => {
    /* ... بدون تغيير */ if (
      !confirm(`هل أنت متأكد من تغيير رتبة هذا المستخدم إلى رتبة جديدة؟`)
    )
      return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (response.ok) {
        toast({
          title: "تم تحديث الرتبة",
          description: "تم تغيير صلاحيات المستخدم بنجاح",
        });
        fetchUsers();
        fetchStats();
      } else {
        throw new Error("فشل التحديث");
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء محاولة تغيير الرتبة",
        variant: "destructive",
      });
    }
  };
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    /* ... بدون تغيير */ try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId, status }),
      });
      if (response.ok) {
        toast({ title: "تم", description: "تم تحديث حالة الطلب" });
        fetchOrders();
        fetchStats();
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الطلب",
        variant: "destructive",
      });
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
  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString("ar-YE")} ر.ي`;
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const handleTestEmail = async () => {
    /* ... بدون تغيير */ if (!testEmail) {
      setEmailResult({
        success: false,
        message: "يرجى إدخال البريد الإلكتروني",
      });
      return;
    }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await response.json();
      if (data.success) {
        setEmailResult({
          success: true,
          message: `✅ تم الإرسال بنجاح! تحقق من البريد الوارد (أو السبام).\nمعرف الرسالة: ${data.messageId}`,
        });
      } else {
        setEmailResult({
          success: false,
          message: `❌ فشل الإرسال: ${data.message || data.error}`,
        });
      }
    } catch {
      setEmailResult({ success: false, message: "❌ حدث خطأ في الاتصال" });
    } finally {
      setEmailSending(false);
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
    /* ... بدون تغيير */ setIsSavingProduct(true);
    try {
      const isEditing = !!selectedProduct;
      const url = isEditing
        ? `/api/products/${selectedProduct.id}`
        : "/api/products";
      const method = isEditing ? "PUT" : "POST";
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
        fetchProducts();
        fetchStats();
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ",
          variant: "destructive",
        });
      }
    } catch {
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
    /* ... بدون تغيير */ if (!confirm("هل أنت متأكد من حذف هذا المنتج؟"))
      return;
    try {
      const response = await fetch(`/api/products?productId=${productId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "تم", description: "تم حذف المنتج" });
        fetchProducts();
        fetchStats();
      }
    } catch {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };
  const handleToggleFeatured = async (product: Product) => {
    /* ... بدون تغيير */ try {
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
    } catch {}
  };

  const tabItems = [
    { id: "overview", label: "نظرة عامة", icon: TrendingUp },
    { id: "users", label: "المستخدمين", icon: Users },
    { id: "orders", label: "الطلبات", icon: Package },
    { id: "products", label: "المنتجات", icon: ShoppingBag },
    { id: "categories", label: "التصنيفات", icon: Tag },
    {
      id: "merchants",
      label: "التجار",
      icon: Store,
      badge: merchantStats.pending,
    },
    { id: "governorates", label: "المحافظات", icon: MapPin },
    { id: "ads", label: "الواجهة والإعلانات", icon: Megaphone },
    { id: "messages", label: "المحادثات", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-[var(--border)] sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 md:gap-4">
              {/* زر القائمة الجانبية لجميع الأجهزة */}
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <div className="flex flex-col h-full bg-[#FAF7F2]">
                    <div className="p-4 border-b border-[#E8E0D8] bg-white">
                      <h3 className="font-bold text-lg text-[#3D3021]">
                        القائمة
                      </h3>
                      <p className="text-xs text-[#8B7355] mt-1">لوحة التحكم</p>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                      <div className="space-y-1">
                        {tabItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <Button
                              key={item.id}
                              variant={isActive ? "default" : "ghost"}
                              className={`w-full justify-start gap-3 py-5 text-base font-medium ${isActive ? "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-white shadow-md" : "hover:bg-white"}`}
                              onClick={() => {
                                setActiveTab(item.id);
                                setIsSidebarOpen(false);
                              }}
                            >
                              <Icon className="h-5 w-5" />
                              <span>{item.label}</span>
                              {item.badge && item.badge > 0 && (
                                <Badge className="mr-auto bg-red-500 text-white">
                                  {item.badge}
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {/* أزرار إضافية في القائمة (لجميع الأجهزة) */}
                    <div className="p-4 border-t border-[#E8E0D8] space-y-2">
                      {onViewStore && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 py-5"
                          onClick={() => {
                            onViewStore();
                            setIsSidebarOpen(false);
                          }}
                        >
                          <Home className="h-5 w-5" /> المتجر
                        </Button>
                      )}
                      {hasPermission("view_dashboard") && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 py-5 border-[var(--gold)] text-[var(--gold-dark)]"
                          onClick={() => {
                            window.location.href = "/dashboard/accounting";
                            setIsSidebarOpen(false);
                          }}
                        >
                          <Calculator className="h-5 w-5" /> النظام المحاسبي
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className="w-full justify-start gap-3 py-5"
                        onClick={() => {
                          onLogout();
                          setIsSidebarOpen(false);
                        }}
                      >
                        <LogOut className="h-5 w-5" /> تسجيل الخروج
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <img
                src="/zeina-logo-header.png"
                alt="زينة"
                className="h-10 w-auto object-contain"
              />
              <Badge className="bg-[var(--gold)] hidden md:inline-flex">
                لوحة الإدارة
              </Badge>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <NotificationBell userId={user.id} />
              {/* أزرار سطح المكتب (تظهر فقط على الشاشات المتوسطة فما فوق) */}
              <div className="hidden md:flex items-center gap-2">
                {onViewStore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewStore}
                    className="gap-2 border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white"
                  >
                    <Home className="h-4 w-4" />{" "}
                    <span className="hidden xl:inline">المتجر</span>
                  </Button>
                )}
                {hasPermission("view_dashboard") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (window.location.href = "/dashboard/accounting")
                    }
                    className="gap-2 border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white"
                  >
                    <Calculator className="h-4 w-4" />{" "}
                    <span className="hidden xl:inline">المحاسبة</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarFallback className="bg-[var(--gold)] text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    الإدارة
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={onLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Overview Tab */}
          <TabsContent value="overview">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--gold)]" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {/* المستخدمين */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-white">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="p-2.5 md:p-3 rounded-xl bg-blue-100">
                            <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-500">
                              المستخدمين
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-gray-800">
                              {stats?.users.total || 0}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-between text-[10px] md:text-xs text-gray-500">
                          <span>{stats?.users.customers || 0} عميلة</span>
                          <span>{stats?.users.agents || 0} مندوبة</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  {/* المنتجات */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-purple-50 to-white">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="p-2.5 md:p-3 rounded-xl bg-purple-100">
                            <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-500">
                              المنتجات
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-gray-800">
                              {stats?.products || 0}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 text-[10px] md:text-xs text-green-600 font-medium">
                          ✓ نشطة
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  {/* الطلبات */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-amber-50 to-white">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="p-2.5 md:p-3 rounded-xl bg-amber-100">
                            <Package className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-500">
                              الطلبات
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-gray-800">
                              {stats?.orders.total || 0}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 text-[10px] md:text-xs text-amber-600 font-medium">
                          {stats?.orders.pending || 0} قيد الانتظار
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  {/* الإيرادات */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-emerald-50 to-white">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="p-2.5 md:p-3 rounded-xl bg-emerald-100">
                            <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-500">
                              الإيرادات
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-gray-800">
                              {formatCurrency(stats?.revenue || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 text-[10px] md:text-xs text-emerald-600 font-medium">
                          إجمالي المبيعات
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Clock className="h-8 w-8 text-yellow-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          قيد الانتظار
                        </p>
                        <p className="text-2xl font-bold">
                          {stats?.orders.pending || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <RefreshCw className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          قيد التجهيز
                        </p>
                        <p className="text-2xl font-bold">
                          {stats?.orders.processing || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          تم التسليم
                        </p>
                        <p className="text-2xl font-bold">
                          {stats?.orders.completed || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <UserCheck className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          المندوبات
                        </p>
                        <p className="text-2xl font-bold">
                          {stats?.users.agents || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>إجراءات سريعة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("users")}
                      >
                        <Users className="h-6 w-6" />
                        <span>إدارة المستخدمين</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("orders")}
                      >
                        <Package className="h-6 w-6" />
                        <span>إدارة الطلبات</span>
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
                        onClick={() => setActiveTab("messages")}
                      >
                        <MessageSquare className="h-6 w-6" />
                        <span>المحادثات</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg border-2 border-[var(--gold)]/20">
                  <CardHeader className="bg-gradient-to-r from-[var(--gold-light)]/10 to-[var(--gold)]/10">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-[var(--gold)]" />
                      اختبار نظام البريد الإلكتروني
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          type="email"
                          placeholder="أدخل البريد الإلكتروني للاختبار"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleTestEmail}
                          disabled={emailSending}
                          className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] min-w-[120px]"
                        >
                          {emailSending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 ml-2" />
                              إرسال اختبار
                            </>
                          )}
                        </Button>
                      </div>
                      {emailResult && (
                        <div
                          className={`p-4 rounded-lg ${emailResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                        >
                          <p
                            className={`whitespace-pre-line ${emailResult.success ? "text-green-700" : "text-red-700"}`}
                          >
                            {emailResult.message}
                          </p>
                        </div>
                      )}
                      <div className="text-sm text-[var(--muted-foreground)] bg-yellow-50 p-3 rounded-lg">
                        <p className="font-medium text-yellow-800 mb-1">
                          ⚠️ ملاحظة مهمة:
                        </p>
                        <ul className="text-yellow-700 space-y-1 list-disc list-inside">
                          <li>البريد المرسل: nbrasalsma@gmail.com</li>
                          <li>
                            إذا لم تصل الرسالة، تحقق من مجلد السبام (Spam)
                          </li>
                          <li>تأكد من أن البريد المرسل موثق في Brevo</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          <TabsContent value="users">
            <AdminUsersTab
              users={users}
              onRefresh={fetchUsers}
              handleToggleUserStatus={handleToggleUserStatus}
              handleUpdateRole={handleUpdateRole}
              formatDate={formatDate}
            />
          </TabsContent>
          <TabsContent value="orders">
            <AdminOrdersTab
              orders={orders}
              onRefresh={fetchOrders}
              onUpdateStatus={handleUpdateOrderStatus}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
          <TabsContent value="products">
            <ProductsTab
              products={products}
              onRefresh={fetchProducts}
              onNewProduct={openNewProduct}
              onEditProduct={openEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onToggleFeatured={handleToggleFeatured}
            />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesTab
              categories={categories}
              onRefresh={fetchCategories}
              onNewCategory={openNewCategory}
              onEditCategory={openEditCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </TabsContent>
          <TabsContent value="governorates">
            <GovernoratesTab
              governorates={governorates}
              govForm={govForm}
              setGovForm={setGovForm}
              isSavingGov={isSavingGov}
              onAddGovernorate={handleAddGovernorate}
              onRefresh={fetchGovernorates}
            />
          </TabsContent>
          <TabsContent value="ads">
            <AdsManager />
          </TabsContent>
          <TabsContent value="messages">
            <AgentInbox agentId={user.id} />
          </TabsContent>
          <TabsContent value="merchants">
            <MerchantsTab
              merchants={merchants}
              merchantStats={merchantStats}
              merchantFilter={merchantFilter}
              setMerchantFilter={setMerchantFilter}
              onRefresh={() =>
                fetchMerchants(
                  merchantFilter === "all" ? undefined : merchantFilter,
                )
              }
              onViewDetails={(merchant) => {
                setSelectedMerchant(merchant);
                setIsMerchantDialogOpen(true);
              }}
              onApproval={handleMerchantApproval}
              formatDate={formatDate}
            />
          </TabsContent>
        </Tabs>
      </div>

      <OrderDetailsDialog
        isOpen={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        order={selectedOrder}
        getStatusBadge={getStatusBadge}
        formatCurrency={formatCurrency}
      />
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
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        categoryForm={categoryForm}
        setCategoryForm={setCategoryForm}
        selectedCategory={selectedCategory}
        isSaving={isSavingCategory}
        onSave={handleSaveCategory}
        onReset={resetCategoryForm}
      />
      <MerchantDetailsDialog
        isOpen={isMerchantDialogOpen}
        onOpenChange={setIsMerchantDialogOpen}
        merchant={selectedMerchant}
        onApproval={(merchantId, approved) => {
          handleMerchantApproval(merchantId, approved);
          setIsMerchantDialogOpen(false);
        }}
        formatDate={formatDate}
        decodeHtml={decodeHtml}
      />
    </div>
  );
}
