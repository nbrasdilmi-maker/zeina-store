"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Phone,
  MapPin,
  CreditCard,
  Printer,
  CheckCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  costPrice: number | null;
  stock: number;
  mainImage: string;
  sku?: string | null;
  category?: { id: string; nameAr: string } | null;
  supplier?: { id: string; name: string } | null;
}

interface CartItem {
  productId: string;
  nameAr: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  image: string;
}

export default function AccountingPOSPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<
    { id: string; nameAr: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "wallet"
  >("cash");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_orders")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/accounting/inventory");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        // استخراج التصنيفات الفريدة
        const cats: { id: string; nameAr: string }[] = [];
        data.products.forEach((p: Product) => {
          if (p.category && !cats.find((c) => c.id === p.category!.id)) {
            cats.push(p.category);
          }
        });
        setCategories(cats);
      }
    } catch (error) {
      console.error("فشل جلب المنتجات:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.nameAr.includes(searchQuery) ||
      p.name.includes(searchQuery) ||
      p.sku?.includes(searchQuery);
    const matchesCategory =
      selectedCategory === "all" || p.category?.id === selectedCategory;
    return matchesSearch && matchesCategory && p.stock > 0;
  });

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      } else {
        toast({
          title: "تنبيه",
          description: "الكمية المطلوبة غير متوفرة",
          variant: "destructive",
        });
      }
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          nameAr: product.nameAr,
          price: product.price,
          quantity: 1,
          maxQuantity: product.stock,
          image: product.mainImage,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxQuantity) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast({
        title: "خطأ",
        description: "اسم العميل مطلوب",
        variant: "destructive",
      });
      return;
    }
    if (cart.length === 0) {
      toast({
        title: "خطأ",
        description: "السلة فارغة",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/accounting/pos", {
        method: "POST",
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: cartTotal,
          paymentMethod,
          notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompletedOrder(data.order);
        setReceiptOpen(true);
        toast({ title: "تم", description: "تمت عملية البيع بنجاح" });
        // إعادة تعيين النموذج
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setNotes("");
        fetchProducts(); // تحديث المخزون
      } else {
        const error = await res.json();
        toast({
          title: "خطأ",
          description: error.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const printReceipt = () => {
    if (!completedOrder) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال بيع</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Tajawal', sans-serif; padding: 20px; background: #fff; }
          .receipt { max-width: 350px; margin: 0 auto; border: 1px solid #E8E0D8; border-radius: 12px; padding: 20px; }
          h2 { color: #C9A962; text-align: center; margin-bottom: 5px; }
          .sub { text-align: center; color: #8B7355; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .items { border-top: 1px dashed #E8E0D8; border-bottom: 1px dashed #E8E0D8; padding: 15px 0; margin: 15px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { font-size: 18px; font-weight: bold; color: #C9A962; }
          .footer { text-align: center; margin-top: 20px; color: #A69B8D; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <h2>زينة</h2>
          <div class="sub">إيصال بيع مباشر</div>
          <div class="row"><span>رقم العملية:</span><span>#${completedOrder.id.slice(-8)}</span></div>
          <div class="row"><span>التاريخ:</span><span>${new Date(completedOrder.createdAt).toLocaleDateString("ar-YE")}</span></div>
          <div class="row"><span>العميل:</span><span>${completedOrder.notes?.replace("بيع مباشر للعميل: ", "") || customerName}</span></div>
          <div class="items">
            ${completedOrder.items
              .map(
                (item: any) => `
              <div class="item">
                <span>${item.product.nameAr} x${item.quantity}</span>
                <span>${formatCurrency(item.price * item.quantity)}</span>
              </div>
            `,
              )
              .join("")}
          </div>
          <div class="row total">
            <span>الإجمالي:</span>
            <span>${formatCurrency(completedOrder.totalAmount)}</span>
          </div>
          <div class="row"><span>طريقة الدفع:</span><span>${paymentMethod === "cash" ? "نقدي" : paymentMethod === "transfer" ? "حوالة" : "محفظة"}</span></div>
          <div class="footer">شكراً لتسوقك من زينة</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#C9A962]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#3D3021]">
            البيع خارج المتجر
          </h2>
          <p className="text-sm text-[#8B7355]">
            نقطة بيع سريعة للمنتجات المتوفرة
          </p>
        </div>
        <ShoppingCart className="h-8 w-8 text-[#C9A962]" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* المنتجات */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A69B8D]" />
              <Input
                placeholder="بحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-[#FAF7F2]"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px] bg-[#FAF7F2]">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                  onClick={() => addToCart(product)}
                >
                  <div className="relative aspect-square bg-[#F5EFE6]">
                    <img
                      src={product.mainImage || "/placeholder.png"}
                      alt={product.nameAr}
                      className="h-full w-full object-cover"
                    />
                    <Badge className="absolute top-2 left-2 bg-[#C9A962]">
                      {product.stock}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-bold text-sm text-[#3D3021] line-clamp-1">
                      {product.nameAr}
                    </h4>
                    <p className="text-[#C9A962] font-bold mt-1">
                      {formatCurrency(product.price)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* السلة ونموذج العميل */}
        <div className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#C9A962]" />
                سلة المشتريات ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {cart.length === 0 ? (
                  <p className="text-center text-[#A69B8D] py-8">السلة فارغة</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-2 p-2 bg-[#FAF7F2] rounded-lg"
                      >
                        <img
                          src={item.image}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.nameAr}
                          </p>
                          <p className="text-xs text-[#8B7355]">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.productId, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.productId, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <Separator className="my-3" />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>الإجمالي:</span>
                <span className="text-[#C9A962]">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">بيانات العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A69B8D]" />
                <Input
                  placeholder="اسم العميل *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A69B8D]" />
                <Input
                  placeholder="رقم الهاتف"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A69B8D]" />
                <Input
                  placeholder="العنوان"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="transfer">حوالة</SelectItem>
                    <SelectItem value="wallet">محفظة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات إضافية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-[#C9A962] hover:bg-[#B8956E]"
                onClick={handleSubmit}
                disabled={isSubmitting || cart.length === 0}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 ml-1" />
                )}
                إتمام البيع
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* نافذة الإيصال */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-[#C9A962]">
              تم البيع بنجاح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-[#FAF7F2] p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>رقم العملية:</span>
                <span className="font-mono">
                  #{completedOrder?.id.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span>الإجمالي:</span>
                <span className="font-bold text-[#C9A962]">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span>{customerName}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReceiptOpen(false)}
              >
                إغلاق
              </Button>
              <Button
                className="flex-1 bg-[#C9A962] hover:bg-[#B8956E]"
                onClick={printReceipt}
              >
                <Printer className="h-4 w-4 ml-1" />
                طباعة الإيصال
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
