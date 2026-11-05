/**
 * Checkout Dialog with Payment Options
 * Supports: Bank transfers, Mobile wallets (Jeib, Kash, Jawali)
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Banknote,
    Wallet,
    Phone,
    User,
    Upload,
    CheckCircle,
    Loader2,
    MessageCircle,
    ArrowRight,
    X,
    MapPin,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload";
import {
    ensureCheckoutIdentity,
    getAuthToken,
    type DemoUser,
} from "@/lib/demo-client";

// Payment recipient info
const PAYMENT_INFO = {
    name: "محمد ابراهيم يحيى عبدالله الديلمي",
    phone: "+967780655615",
};

const WHATSAPP_NUMBER = "967780655615";

interface CheckoutDialogProps {
    isOpen: boolean;
    onClose: () => void;
    items: Array<{
        productId: string;
        name: string;
        nameAr: string;
        price: number;
        quantity: number;
        image: string;
        color?: string | null;
    }>;
    userId: string;
    onSuccess: (orderId: string) => void;
    onSessionReady?: (user: DemoUser) => void;
}

export function CheckoutDialog({
    isOpen,
    onClose,
    items,
    userId,
    onSuccess,
    onSessionReady,
}: CheckoutDialogProps) {
    const [step, setStep] = useState<"payment" | "details" | "success">("payment");
    const [paymentMethod, setPaymentMethod] = useState<"transfer" | "wallet" | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<"jeib" | "kash" | "jawali" | null>(null);
    const [transferNumber, setTransferNumber] = useState("");
    const [paymentProof, setPaymentProof] = useState("");
    const [notes, setNotes] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("+967");
    const [governorate, setGovernorate] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [locationLink, setLocationLink] = useState("");

    // --- إعدادات التوصيل المرنة (آلي / يدوي / تفاوض) ---
    const [governoratesList, setGovernoratesList] = useState<any[]>([]);
    const [shippingMethod, setShippingMethod] = useState<"auto" | "manual" | "negotiate">("auto");
    const [manualShippingFee, setManualShippingFee] = useState<string>("0");
    const [selectedGovData, setSelectedGovData] = useState<any>(null);

    // جلب بيانات العميل المسجلة مسبقاً وتعبئتها في الحقول (مع تركها قابلة للتعديل)
    useEffect(() => {
        if (isOpen) {
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    // تعبئة الاسم تلقائياً
                    if (userData.name) {
                        setCustomerName(userData.name);
                    }
                    // تعبئة رقم الهاتف مع الحفاظ على مفتاح اليمن
                    if (userData.phone) {
                        let phoneVal = userData.phone;
                        if (!phoneVal.startsWith("+967")) {
                            phoneVal = "+967" + phoneVal.replace(/^\+?967/, "");
                        }
                        setPhone(phoneVal);
                    }
                } catch (e) {
                    console.error("خطأ في قراءة بيانات العميل");
                }
            }
        }
    }, [isOpen]);

    // جلب المحافظات من السيرفر فور فتح النافذة
    useEffect(() => {
        if (isOpen) {
            fetch("/api/governorates")
                .then(res => res.json())
                .then(data => {
                    console.log("بيانات المحافظات من السيرفر:", data);
                    const govsArray = data.governorates || data || [];
                    setGovernoratesList(Array.isArray(govsArray) ? govsArray : []);
                })
                .catch(err => console.error("Error fetching govs:", err));
        }
    }, [isOpen]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [orderId, setOrderId] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const safeItems = items || [];

    // 1. حساب صافي سعر المنتجات
    const subtotal = safeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 2. تحديد رسوم التوصيل بناءً على خيار العميل (آلي / يدوي / تفاوض)
    const shippingFee =
        shippingMethod === "auto" ? (selectedGovData?.deliveryFee || 0) :
            shippingMethod === "manual" ? (parseFloat(manualShippingFee) || 0) :
                0;

    // 3. المجموع النهائي (سعر المنتجات + رسوم التوصيل)
    const total = subtotal + shippingFee;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // ⚡ تحديد مسار المجلد: إثباتات الدفع / رقم المستخدم
            const folderPath = `/Payment_Proofs/User_${userId || "Guest"}`;

            const result = await uploadImage(file, folderPath);
            if (result.success && result.url) {
                setPaymentProof(result.url);
                toast({
                    title: "تم رفع الصورة",
                    description: "تم الحفظ في السحابة بنجاح",
                });
            } else {
                throw new Error(result.error || "فشل رفع الصورة");
            }
        } catch {
            toast({
                title: "خطأ",
                description: "فشل رفع الصورة",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast({ title: "خطأ", description: "متصفحك لا يدعم مشاركة الموقع", variant: "destructive" });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                setLocationLink(mapsUrl);
                toast({ title: "تم بنجاح", description: "تم تحديد موقعك بدقة ✓" });
            },
            () => {
                toast({ title: "تنبيه", description: "يرجى السماح بالوصول للموقع لتسهيل التوصيل", variant: "destructive" });
            }
        );
    };

    const handleSubmitOrder = async () => {
        // 1. التحقق من الاسم الكامل (إضافة جديدة)
        if (!customerName || customerName.trim().length < 3) {
            toast({ title: "تنبيه", description: "يرجى التحقق من الاسم وكتابة الاسم الكامل", variant: "destructive" });
            return;
        }

        // 2. التحقق من الهاتف والعنوان (موجود عندك)
        if (!phone || !address) {
            toast({ title: "خطأ", description: "يرجى ملء العنوان ورقم الهاتف", variant: "destructive" });
            return;
        }

        
        // 4. التحقق من طريقة الدفع (موجود عندك)
        if (!paymentMethod) {
            toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع", variant: "destructive" });
            return;
        }

        // 5. التحقق من تفاصيل الحوالة (موجود عندك)
        if (paymentMethod === "transfer" && !transferNumber) {
            toast({ title: "خطأ", description: "يرجى إدخال رقم الحوالة", variant: "destructive" });
            return;
        }

        // 6. التحقق من صورة الإثبات (موجود عندك)
        if (paymentMethod === "wallet" && !paymentProof) {
            toast({ title: "خطأ", description: "يرجى رفع صورة إثبات التحويل", variant: "destructive" });
            return;
        }

        // معالجة ذكية: إضافة كلمة "محافظة" تلقائياً إذا لم تكن موجودة
        let finalGovernorate = governorate.trim();
        if (finalGovernorate && !finalGovernorate.startsWith("محافظة")) {
            finalGovernorate = "محافظة " + finalGovernorate;
        }

        // --- بداية معالجة الطلب في السيرفر ---
        setIsProcessing(true);
        try {
            // زائر بدون حساب: ننشئ جلسة ضيف مؤقتة قبل إنشاء الطلب.
            let effectiveUserId = userId;
            let authToken = getAuthToken();

            if (!effectiveUserId || !authToken) {
                const identity = await ensureCheckoutIdentity({
                    name: customerName,
                    phone,
                });
                effectiveUserId = identity.user.id;
                authToken = identity.token;
                onSessionReady?.(identity.user);
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
                    locationLink,
                    items: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        color: item.color,
                    })),
                    totalAmount: total,
                    address,
                    phone,
                    governorate,
                    notes: notes || undefined,
                    paymentMethod,
                    paymentDetails: paymentMethod === "transfer"
                        ? { transferNumber }
                        : { wallet: selectedWallet, proofImage: paymentProof },
                }),
            });

            const data = await response.json();

            if (response.ok && data.order) {
                // 1. التقاط وتجهيز بيانات الرسالة (قبل تفريغ السلة)
                const currentSubtotal = subtotal;
                const currentTotal = total;
                const currentShippingFee = shippingFee;

                const productsListStr = items.map(item =>
                    `• ${item.nameAr} ${item.color ? `(اللون: ${item.color})` : ''}\n` +
                    `  🔹 العدد: ${item.quantity}\n` +
                    `  🖼️ صورة المنتج: ${item.image}`
                ).join('\n-------------------------\n');

                const paymentInfoStr = paymentMethod === "transfer"
                    ? `🔹 طريقة الدفع: حوالة\n🔢 رقم الحوالة: ${transferNumber}`
                    : `🔹 طريقة الدفع: محفظة (${selectedWallet === 'jeib' ? 'جيب' : selectedWallet === 'kash' ? 'كاش' : 'جوالي'})\n🖼️ إثبات الدفع: ${paymentProof}`;

                const autoMessage = `*طلب جديد من متجر زينة* 🛒\n\n` +
                    `👤 *بيانات العميل:*\n` +
                    `• الاسم: ${customerName}\n` +
                    `• الهاتف: ${phone}\n` +
                    `• المحافظة: ${governorate}\n` +
                    `• العنوان: ${address}\n` +
                    `📍 *الموقع:* ${locationLink || 'لم يتم مشاركة الموقع'}\n\n` +
                    `📦 *المنتجات المطلوبة:*\n${productsListStr}\n\n` +
                    `💰 *الملخص المالي:*\n` +
                    `• قيمة المنتجات: ${currentSubtotal.toLocaleString()} ر.ي\n` +
                    `• رسوم التوصيل: ${currentShippingFee.toLocaleString()} ر.ي\n` +
                    `• *الإجمالي الكلي: ${currentTotal.toLocaleString()} ر.ي*\n\n` +
                    `💳 *بيانات الدفع:*\n${paymentInfoStr}\n\n` +
                    `📝 *ملاحظات:* ${notes || 'لا يوجد'}\n` +
                    `-------------------------\n` +
                    `رقم الطلب: #${data.order.id.slice(-8)}`;

                // 2. تحديث واجهة التطبيق
                setOrderId(data.order.id);
                setStep("success");
                toast({ title: "تم", description: "تم إنشاء الطلب بنجاح، جاري تحويلك للواتساب..." });

                // 3. التوجيه التلقائي الإجباري للواتساب (بعد ثانية ونصف)
                setTimeout(() => {
                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(autoMessage)}`, '_blank');
                    // 4. تفريغ السلة "بعد" إرسال البيانات للواتساب
                    onSuccess(data.order.id);
                }, 1500);

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
        // 1. تجهيز قائمة المنتجات مع (الألوان + العدد + رابط الصورة السحابي)
        const productsList = items.map(item =>
            `• ${item.nameAr} ${item.color ? `(اللون: ${item.color})` : ''}\n` +
            `  🔹 العدد: ${item.quantity}\n` +
            `  🖼️ رابط الصورة (ImageKit): ${item.image}\n`
        ).join('-------------------------\n');

        // 2. تجهيز معلومات الدفع (تشمل رابط صورة الإثبات السحابي أيضاً)
        const paymentInfo = paymentMethod === "transfer"
            ? `🔹 طريقة الدفع: حوالة\n🔢 رقم الحوالة: ${transferNumber}`
            : `🔹 طريقة الدفع: محفظة (${selectedWallet === 'jeib' ? 'جيب' : selectedWallet === 'kash' ? 'كاش' : 'جوالي'})\n🖼️ رابط إثبات الدفع (ImageKit): ${paymentProof}`;

        // 3. بناء الرسالة "الحنان الطنان" المتكاملة
        const message = `*طلب جديد من متجر زينة* 🛒

👤 *بيانات العميل:*
• الاسم: ${customerName}
• الهاتف: ${phone}
• المحافظة: ${governorate}
• العنوان: ${address}
📍 *رابط الموقع (Google Maps):* ${locationLink || 'لم يتم مشاركة الموقع'}

📦 *المنتجات المطلوبة:*
 ${productsList}

💰 *الملخص المالي:*
• قيمة المنتجات: ${subtotal.toLocaleString()} ر.ي
• رسوم التوصيل: ${shippingFee.toLocaleString()} ر.ي
• *الإجمالي الكلي: ${total.toLocaleString()} ر.ي*

💳 *بيانات التحويل:*
 ${paymentInfo}

📝 *ملاحظات إضافية:* ${notes || 'لا يوجد'}

-------------------------
رقم الطلب: #${orderId.slice(-8)}`;

        // 4. فتح الرابط في الواتساب
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const resetState = () => {
        setStep("payment");
        setPaymentMethod(null);
        setSelectedWallet(null);
        setTransferNumber("");
        setPaymentProof("");
        setNotes("");
        setOrderId("");
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl text-center">
                        {step === "payment" && "اختيار طريقة الدفع"}
                        {step === "details" && "تفاصيل الطلب"}
                        {step === "success" && "تم الطلب بنجاح ✓"}
                    </DialogTitle>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {step === "payment" && (
                        <motion.div
                            key="payment"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 mt-4"
                        >
                            {/* --- رسالة الترحيب الفخمة (إضافة جديدة) --- */}
                            <div className="bg-gradient-to-r from-[#FDFBF7] to-[#F9F6ED] border border-[#C9A962]/30 rounded-xl p-4 text-center shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C9A962] to-transparent opacity-70"></div>
                                <h3 className="text-lg font-black text-[#3D3021] mb-1 flex items-center justify-center gap-2">
                                    ✨ أهلاً بكِ في زينة ✨
                                </h3>
                                <p className="text-xs sm:text-sm text-[#8B7355] font-medium leading-relaxed">
                                    أنتِ على بُعد خطوة واحدة من إتمام أناقتك.. <br />
                                    اختاري طريقة الدفع المناسبة وسنتكفل بالباقي.
                                </p>
                            </div>

                            {/* Payment Methods */}
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
                                    className="p-4 bg-gray-50 rounded-lg space-y-3"
                                >
                                    <p className="text-sm font-medium text-gray-600">أرسل الحوالة إلى:</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-[var(--gold)]" />
                                            <span className="font-bold">{PAYMENT_INFO.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-[var(--gold)]" />
                                            <span className="font-bold" dir="ltr">{PAYMENT_INFO.phone}</span>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Label>رقم الحوالة *</Label>
                                        <Input
                                            placeholder="أدخلي رقم الحوالة"
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
                                    className="space-y-3"
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
                                                    <span className="font-bold" dir="ltr">{PAYMENT_INFO.phone}</span>
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
                                                    <div className="mt-2">
                                                        <img src={paymentProof} alt="إثبات الدفع" className="w-full h-32 object-cover rounded-lg" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* Notes */}
                            <div>
                                <Label>ملاحظات (اختياري)</Label>
                                <Input
                                    placeholder="أي ملاحظات إضافية..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            {/* Continue Button */}
                            <Button
                                className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                                size="lg"
                                onClick={() => setStep("details")}
                                disabled={!paymentMethod || (paymentMethod === "wallet" && !paymentProof)}
                            >
                                متابعة
                                <ArrowRight className="h-4 w-4 mr-2" />
                            </Button>
                        </motion.div>
                    )}

                    {step === "details" && (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 mt-4"
                        >
                            {/* 1. حقل الاسم الكامل */}
                            <div>
                                <Label className="text-[#3D3021] font-bold">الاسم الكامل *</Label>
                                <Input
                                    placeholder="اكتب اسم المستلم الكامل"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="mt-1 border-[#E8E0D8] focus:border-[#C9A962]"
                                />
                            </div>

                            {/* Shipping Details */}
                            <div className="space-y-3">
                                <div>
                                    <Label>رقم الهاتف *</Label>
                                    <Input
                                        placeholder="+967700000000"
                                        value={phone}
                                        onChange={(e) => {
                                            let val = e.target.value;
                                            // منع العميل من مسح المفتاح +967
                                            if (!val.startsWith("+967")) {
                                                val = "+967" + val.replace(/^\+?967/, "");
                                            }
                                            setPhone(val);
                                        }}
                                        className="mt-1 border-[#E8E0D8] focus:border-[#C9A962]"
                                        dir="ltr"
                                    />
                                </div>

                                {/* --- قسم التوصيل المرن --- */}
                                <div className="space-y-4 p-4 bg-white rounded-xl border border-[#E8E0D8]">
                                    <Label className="text-[#3D3021] font-bold">طريقة حساب رسوم التوصيل:</Label>

                                    {/* أزرار اختيار النوع */}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button" variant={shippingMethod === "auto" ? "default" : "outline"} size="sm"
                                            onClick={() => setShippingMethod("auto")} className="rounded-full"
                                        >آلي (من القائمة)</Button>
                                        <Button
                                            type="button" variant={shippingMethod === "manual" ? "default" : "outline"} size="sm"
                                            onClick={() => setShippingMethod("manual")} className="rounded-full"
                                        >يدوي (أنا أعرف السعر)</Button>
                                        <Button
                                            type="button" variant={shippingMethod === "negotiate" ? "default" : "outline"} size="sm"
                                            onClick={() => setShippingMethod("negotiate")} className="rounded-full"
                                        >اتفاق عبر الواتساب</Button>
                                    </div>

                                    {/* 1. لو اختار آلي: يظهر له دروب داون للمحافظات */}
                                    {shippingMethod === "auto" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">اختر المحافظة من القائمة:</Label>
                                            <select
                                                className="w-full p-2.5 rounded-lg border border-[#E8E0D8] bg-gray-50 text-sm outline-none focus:border-[#C9A962]"
                                                value={governorate}
                                                onChange={(e) => {
                                                    const gov = governoratesList.find(g => g.nameAr === e.target.value);
                                                    setGovernorate(e.target.value);
                                                    setSelectedGovData(gov);
                                                }}
                                            >
                                                <option value="">-- اختر المحافظة --</option>
                                                {governoratesList.map((gov) => (
                                                    <option key={gov.id} value={gov.nameAr}>
                                                        {gov.nameAr} (التوصيل: {gov.deliveryFee} ر.ي)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* 2. لو اختار يدوي: يظهر له اسم المحافظة وسعرها */}
                                    {shippingMethod === "manual" && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs">المحافظة:</Label>
                                                <Input
                                                    placeholder="مثلاً: صنعاء" value={governorate}
                                                    onChange={(e) => setGovernorate(e.target.value)} className="h-9"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">سعر التوصيل:</Label>
                                                <Input
                                                    type="number" placeholder="0" value={manualShippingFee}
                                                    onChange={(e) => setManualShippingFee(e.target.value)} className="h-9"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. لو اختار تفاوض: تظهر رسالة بسيطة */}
                                    {shippingMethod === "negotiate" && (
                                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                                            سيتم الاتفاق على سعر التوصيل المناسب عند مراسلتنا في الواتساب.
                                        </div>
                                    )}
                                </div>

                                {/* قسم العنوان مع ميزة مشاركة الموقع الفعلي */}
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-[#3D3021] font-bold">العنوان التفصيلي *</Label>
                                        <Input
                                            placeholder="المدينة، الحي، الشارع، قرب..."
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="mt-1 border-[#E8E0D8] focus:border-[#C9A962]"
                                        />
                                    </div>

                                    {/* --- إضافة ميزة زر مشاركة الموقع (Google Maps) --- */}
                                    <div className="pt-1">
                                        <Button
                                            type="button"
                                            variant={locationLink ? "default" : "outline"}
                                            className={`w-full gap-2 transition-all duration-300 ${locationLink
                                                    ? "bg-green-600 hover:bg-green-700 text-white border-none shadow-md"
                                                    : "border-[#C9A962] text-[#8B7355] hover:bg-[#FDFBF7]"
                                                }`}
                                            onClick={handleGetLocation}
                                        >
                                            {/* أيقونة الموقع */}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            {locationLink ? "تم تحديد موقعك بنجاح ✓" : "إرسال موقعي الحالي (Google Maps)"}
                                        </Button>

                                        {locationLink && (
                                            <p className="text-[10px] text-green-600 mt-2 text-center font-bold animate-pulse">
                                                تم ربط الإحداثيات بنجاح وسوف تظهر للمندوب في الواتساب
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="font-bold mb-2">ملخص الطلب</p>
                                <div className="space-y-2 text-sm">
                                    {/* السطر الأصلي عندك (سنبقي عليه) */}
                                    <div className="flex justify-between">
                                        <span>المنتجات ({safeItems.length})</span>
                                        <span>{subtotal.toLocaleString()} ر.ي</span>
                                    </div>

                                    {/* --- الإضافة الأولى: سطر صافي المنتجات (للتوضيح) --- */}
                                    <div className="flex justify-between text-xs text-gray-500 pl-2">
                                        <span>صافي المنتجات:</span>
                                        <span>{subtotal.toLocaleString()} ر.ي</span>
                                    </div>

                                    {/* --- الإضافة الثانية: سطر رسوم التوصيل (القلب النابض) --- */}
                                    <div className="flex justify-between text-blue-600 font-medium pb-2">
                                        <span>رسوم التوصيل ({
                                            shippingMethod === 'auto' ? `محافظة ${governorate || 'مختارة'}` :
                                                shippingMethod === 'manual' ? 'يدوي' :
                                                    'اتفاق في الواتساب'
                                        }):</span>
                                        <span>{shippingFee.toLocaleString()} ر.ي</span>
                                    </div>

                                    {/* السطر الأصلي عندك (سنبقي عليه كما هو) */}
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                        <span>المجموع</span>
                                        <span className="text-[var(--gold-dark)]">{total.toLocaleString()} ر.ي</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Summary */}
                            <div className="p-3 bg-[var(--gold)]/10 rounded-lg text-sm">
                                <p className="font-medium">طريقة الدفع:</p>
                                <p>
                                    {paymentMethod === "transfer"
                                        ? `حوالة - رقم: ${transferNumber}`
                                        : `${selectedWallet === 'jeib' ? 'جيب' : selectedWallet === 'kash' ? 'كاش' : 'جوالي'} - تم إرفاق صورة`}
                                </p>
                            </div>

                            {/* Submit Button */}
                            <Button
                                className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                                size="lg"
                                onClick={handleSubmitOrder}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    "تأكيد الطلب"
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => setStep("payment")}
                            >
                                العودة
                            </Button>
                        </motion.div>
                    )}

                    {step === "success" && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6 space-y-4"
                        >
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>

                            <div>
                                <p className="text-lg font-bold">تم إنشاء طلبك بنجاح!</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    رقم الطلب: <span className="font-mono font-bold">#{orderId.slice(-8)}</span>
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg text-right">
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

                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                size="lg"
                                onClick={openWhatsApp}
                            >
                                <MessageCircle className="h-5 w-5 ml-2" />
                                إرسال الطلب للواتساب
                            </Button>

                            <p className="text-xs text-gray-500">
                                سيتم التواصل معك قريباً لتأكيد الطلب
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}