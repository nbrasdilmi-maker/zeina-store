"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Menu,
  ChevronLeft,
  Banknote,
  Wallet,
  Phone,
  User,
  Upload,
  CheckCircle,
  Loader2,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/contexts/cart-context";
import {
  ensureCheckoutIdentity,
  getAuthToken,
  readAnyUser,
} from "@/lib/demo-client";
import { uploadImage } from "@/lib/upload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

// Payment info
const PAYMENT_INFO = {
  name: "محمد ابراهيم يحيى عبدالله الديلمي",
  phone: "+967780655615",
};

const WHATSAPP_NUMBER = "967780655615";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export default function CheckoutPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { state: cartState, clearCart } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "wallet" | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<"jeib" | "kash" | "jawali" | null>(null);
  const [transferNumber, setTransferNumber] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    setMounted(true);
    const stored = readAnyUser();
    if (stored) {
      setUser(stored);
      setCustomerName(stored.name || "");
      setPhone(stored.phone || "");
      setAddress(stored.address || "");
    }
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = cartState?.cart.items || [];
  const itemCount = cartState?.cart.itemCount || 0;
  const total = cartState?.cart.total || 0;
  const discount = cartState?.cart.discount || 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadImage(file);
      if (result.success && result.url) {
        setPaymentProof(result.url);
        toast({ title: "تم رفع الصورة", description: "تم الحفظ في السحابة" });
      } else {
        throw new Error(result.error || "فشل رفع الصورة");
      }
    } catch {
      toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!customerName || customerName.trim().length < 3) {
      toast({ title: "خطأ", description: "يرجى كتابة الاسم الكامل", variant: "destructive" });
      return;
    }

    if (!phone || !address) {
      toast({ title: "خطأ", description: "يرجى ملء العنوان ورقم الهاتف", variant: "destructive" });
      return;
    }

    if (!paymentMethod) {
      toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع", variant: "destructive" });
      return;
    }

    if (paymentMethod === "transfer" && !transferNumber) {
      toast({ title: "خطأ", description: "يرجى إدخال رقم الحوالة", variant: "destructive" });
      return;
    }

    if (paymentMethod === "wallet" && !paymentProof) {
      toast({ title: "خطأ", description: "يرجى رفع صورة إثبات التحويل", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const finalTotal = total - discount;

      // A guest can complete the order through a temporary demo identity.
      let effectiveUserId = user?.id || "";
      let authToken = getAuthToken();

      if (!effectiveUserId || !authToken) {
        const identity = await ensureCheckoutIdentity({
          name: customerName,
          phone,
        });
        effectiveUserId = identity.user.id;
        authToken = identity.token;
        setUser(identity.user);
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken
            ? { Authorization: `Bearer ${authToken}` }
            : {}),
        },
        body: JSON.stringify({
          customerId: effectiveUserId,
          customerName,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: finalTotal,
          address,
          phone,
          governorate,
          notes: notes || undefined,
          paymentMethod,
          paymentDetails:
            paymentMethod === "transfer"
              ? { transferNumber }
              : { wallet: selectedWallet, proofImage: paymentProof },
        }),
      });

      const data = await response.json();

      if (response.ok && data.order) {
        setOrderId(data.order.id);
        setIsSuccess(true);
        clearCart();
        toast({ title: "تم", description: "تم إنشاء الطلب بنجاح" });
      } else {
        throw new Error(data.error || "حدث خطأ");
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الطلب",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsApp = () => {
    const productsList = items
      .map((item) => `• ${item.nameAr} (${item.quantity} قطعة)`)
      .join("\n");
    const finalTotal = total - discount;
    const paymentInfo =
      paymentMethod === "transfer"
        ? `رقم الحوالة: ${transferNumber}`
        : `تم الدفع عبر ${selectedWallet === "jeib" ? "محفظة جيب" : selectedWallet === "kash" ? "كاش" : "جوالي"}`;

    const message = `مرحباً، أنا ${customerName || user?.name || "زائر"}
أريد طلب المنتجات التالية:

${productsList}

رقم الطلب: #${orderId.slice(-8)}
المجموع: ${finalTotal.toLocaleString()} ر.ي

${paymentInfo}

${notes ? `ملاحظات: ${notes}` : ""}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const finalTotal = total - discount;

  if (items.length === 0 && !isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">السلة فارغة</h1>
          <Link href="/products">
            <Button className="bg-[var(--gold)]">تصفح المنتجات</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">تم إنشاء طلبك بنجاح!</h1>
            <p className="text-gray-500 mb-4">
              رقم الطلب: <span className="font-mono font-bold">#{orderId.slice(-8)}</span>
            </p>

            <div className="p-4 bg-gray-50 rounded-lg mb-4 text-right">
              <p className="text-sm font-medium mb-2">المنتجات المطلوبة:</p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-2">
                    <img src={item.image} alt={item.nameAr} className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.nameAr}</p>
                      <p className="text-xs text-gray-500">{item.quantity} قطعة</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700 mb-3" size="lg" onClick={openWhatsApp}>
              <MessageCircle className="h-5 w-5 ml-2" />
              إرسال الطلب للواتساب
            </Button>

            <p className="text-xs text-gray-500">سيتم التواصل معك قريباً لتأكيد الطلب</p>

            <Link href="/">
              <Button variant="outline" className="w-full mt-4">
                العودة للرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link href="/" className="text-lg font-semibold">الرئيسية</Link>
                  <Link href="/products" className="text-lg font-semibold">المنتجات</Link>
                  <Link href="/cart" className="text-lg font-semibold">السلة</Link>
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2">
              <img src="/zeina-logo-header.png" alt="زينة" className="h-10 w-auto object-contain" />
            </Link>

            <Link href="/cart">
              <Button variant="ghost">العودة للسلة</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">إتمام الشراء</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">طريقة الدفع</h2>

                <div className="space-y-3">
                  <Button
                    variant={paymentMethod === "transfer" ? "default" : "outline"}
                    className={`w-full h-auto py-4 justify-start ${paymentMethod === "transfer" ? "bg-[var(--gold)]" : ""}`}
                    onClick={() => setPaymentMethod("transfer")}
                  >
                    <div className="flex items-center gap-3">
                      <Banknote className="h-6 w-6" />
                      <div className="text-right">
                        <p className="font-bold">حوالة</p>
                        <p className="text-xs opacity-70">تحويل عبر مكاتب الصرافة</p>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant={paymentMethod === "wallet" ? "default" : "outline"}
                    className={`w-full h-auto py-4 justify-start ${paymentMethod === "wallet" ? "bg-[var(--gold)]" : ""}`}
                    onClick={() => setPaymentMethod("wallet")}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="h-6 w-6" />
                      <div className="text-right">
                        <p className="font-bold">محافظ وبنوك</p>
                        <p className="text-xs opacity-70">جيب، كاش، جوالي</p>
                      </div>
                    </div>
                  </Button>
                </div>

                {/* Transfer Details */}
                {paymentMethod === "transfer" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-gray-50 rounded-lg space-y-3 mt-4"
                  >
                    <p className="text-sm font-medium text-gray-600">أرسل الحوالة إلى:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[var(--gold)]" />
                        <span className="font-bold">{PAYMENT_INFO.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[var(--gold)]" />
                        <span className="font-bold" dir="ltr">
                          {PAYMENT_INFO.phone}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Label>رقم الحوالة *</Label>
                      <Input
                        placeholder="أدخل رقم الحوالة"
                        value={transferNumber}
                        onChange={(e) => setTransferNumber(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Wallet Details */}
                {paymentMethod === "wallet" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 mt-4"
                  >
                    <p className="text-sm font-medium">اختر المحفظة:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "jeib", name: "جيب", color: "bg-purple-500" },
                        { id: "kash", name: "كاش", color: "bg-blue-500" },
                        { id: "jawali", name: "جوالي", color: "bg-green-500" },
                      ].map((wallet) => (
                        <Button
                          key={wallet.id}
                          variant={selectedWallet === wallet.id ? "default" : "outline"}
                          className={`h-auto py-3 ${selectedWallet === wallet.id ? wallet.color + " text-white" : ""}`}
                          onClick={() => setSelectedWallet(wallet.id as "jeib" | "kash" | "jawali")}
                        >
                          {wallet.name}
                        </Button>
                      ))}
                    </div>

                    {selectedWallet && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-gray-50 rounded-lg space-y-3"
                      >
                        <p className="text-sm font-medium text-gray-600">أرسل المبلغ إلى:</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-[var(--gold)]" />
                            <span className="font-bold">{PAYMENT_INFO.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[var(--gold)]" />
                            <span className="font-bold" dir="ltr">
                              {PAYMENT_INFO.phone}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Label>صورة إثبات التحويل *</Label>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            className="w-full mt-1"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin ml-2" />
                            ) : (
                              <Upload className="h-4 w-4 ml-2" />
                            )}
                            {paymentProof ? "تغيير الصورة" : "رفع صورة التحويل"}
                          </Button>
                          {paymentProof && (
                            <div className="mt-2 flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">تم رفع الصورة</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Notes */}
                <div className="mt-4">
                  <Label>ملاحظات (اختياري)</Label>
                  <Input
                    placeholder="أي ملاحظات إضافية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">معلومات التوصيل</h2>

                <div className="space-y-4">
                  <div>
                    <Label>الاسم الكامل *</Label>
                    <Input
                      placeholder="اكتب اسمك الكامل"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>رقم الهاتف *</Label>
                    <Input
                      placeholder="+967XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <Label>المحافظة</Label>
                    <Input
                      placeholder="صنعاء، عدن، تعز..."
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>العنوان التفصيلي *</Label>
                    <Input
                      placeholder="المدينة، الحي، الشارع، قرب..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">ملخص الطلب</h2>

                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.nameAr}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.nameAr}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} × {item.price.toLocaleString()} ر.ي
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">المنتجات ({itemCount})</span>
                    <span>{total.toLocaleString()} ر.ي</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>الخصم</span>
                      <span>-{discount.toLocaleString()} ر.ي</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>المجموع</span>
                    <span className="text-[var(--gold-dark)]">{finalTotal.toLocaleString()} ر.ي</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)] mt-6"
                  size="lg"
                  onClick={handleSubmitOrder}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      تأكيد الطلب
                      <ArrowRight className="mr-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
