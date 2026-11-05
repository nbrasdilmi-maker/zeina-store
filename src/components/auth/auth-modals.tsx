"use client";
import { useState } from "react";
import { uploadImage } from "@/lib/upload";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Mail,
    Lock,
    User,
    Phone,
    MapPin,
    ArrowLeft,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    Store,
    CreditCard,
    Upload,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { clearDemoSession } from "@/lib/demo-client";

interface AuthModalsProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: "login" | "register";
}

// Password strength checker
function checkPasswordStrength(password: string): {
    score: number;
    checks: { label: string; passed: boolean }[];
} {
    return {
        score: [
            password.length >= 8,
            /[A-Z]/.test(password),
            /[a-z]/.test(password),
            /\d/.test(password),
            /[!@#$%^&*(),.?":{}|<>]/.test(password),
        ].filter(Boolean).length,
        checks: [
            { label: "8 أحرف على الأقل", passed: password.length >= 8 },
            { label: "حرف كبير (A-Z)", passed: /[A-Z]/.test(password) },
            { label: "حرف صغير (a-z)", passed: /[a-z]/.test(password) },
            { label: "رقم (0-9)", passed: /\d/.test(password) },
        ],
    };
}

export function AuthModals({ isOpen, onClose, defaultTab = "login" }: AuthModalsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [step, setStep] = useState<"form" | "verify">("form");
    const [userId, setUserId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
    const [isMerchantVerify, setIsMerchantVerify] = useState(false);

    // Validation errors state
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [serverError, setServerError] = useState<string>("");

    // Login form state
    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
    });

    // Register form state
    const [registerData, setRegisterData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        address: "",
    });

    // Merchant form state
    const [merchantData, setMerchantData] = useState({
        storeName: "",
        storeType: "",
        fullName: "",
        phone: "",
        email: "",
        address: "",
        identityCardImage: "",
        jeibWallet: "",
        kashWallet: "",
        jawaliWallet: "",
        transferInfo: "",
        password: "",
        confirmPassword: "",
    });
    // Image upload state for merchant
    const [isUploadingIdentity, setIsUploadingIdentity] = useState(false);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetStep, setResetStep] = useState<"email" | "verify" | "success">("email");
    const [resetUserId, setResetUserId] = useState("");
    const [newPassword, setNewPassword] = useState("");

    // Clear errors when tab changes
    const handleTabChange = (tab: string) => {
        setActiveTab(tab as "login" | "register");
        setValidationErrors([]);
        setServerError("");
    };

    // Validate register form locally
    const validateRegisterForm = (): boolean => {
        const errors: string[] = [];

        if (!registerData.name || registerData.name.length < 2) {
            errors.push("الاسم يجب أن يكون حرفين على الأقل");
        }

        if (!registerData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
            errors.push("البريد الإلكتروني غير صحيح");
        }

        const strength = checkPasswordStrength(registerData.password);
        if (strength.score < 4) {
            errors.push("كلمة المرور ضعيفة: يجب أن تحتوي على 8 أحرف، حرف كبير، حرف صغير، ورقم");
        }

        if (registerData.password !== registerData.confirmPassword) {
            errors.push("كلمات المرور غير متطابقة");
        }

        if (!registerData.phone || registerData.phone.length < 6) {
            errors.push("رقم الهاتف غير صحيح");
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    // Validate merchant form locally
    const validateMerchantForm = (): boolean => {
        const errors: string[] = [];

        if (!merchantData.storeName || merchantData.storeName.length < 2) {
            errors.push("اسم المحل يجب أن يكون حرفين على الأقل");
        }

        if (!merchantData.storeType || merchantData.storeType.length < 2) {
            errors.push("نوع المنتجات مطلوب");
        }

        if (!merchantData.fullName || merchantData.fullName.length < 2) {
            errors.push("الاسم الكامل مطلوب");
        }

        if (!merchantData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merchantData.email)) {
            errors.push("البريد الإلكتروني غير صحيح");
        }

        if (!merchantData.phone || merchantData.phone.length < 6) {
            errors.push("رقم الهاتف غير صحيح");
        }

        if (!merchantData.address || merchantData.address.length < 3) {
            errors.push("عنوان المحل مطلوب");
        }

        if (!merchantData.identityCardImage) {
            errors.push("صورة البطاقة الشخصية مطلوبة");
        }

        const merchantStrength = checkPasswordStrength(merchantData.password);
        if (merchantStrength.score < 4) {
            errors.push("كلمة المرور ضعيفة: يجب أن تحتوي على 8 أحرف، حرف كبير، حرف صغير، ورقم");
        }

        if (merchantData.password !== merchantData.confirmPassword) {
            errors.push("كلمات المرور غير متطابقة");
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    // Handle identity card image upload
    const handleIdentityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingIdentity(true);
        try {
            const result = await uploadImage(file);
            if (result.success && result.url) {
                setMerchantData({ ...merchantData, identityCardImage: result.url });
                toast({
                    title: "تم الرفع",
                    description: "تم رفع صورة البطاقة بنجاح",
                });
            } else {
                toast({
                    title: "خطأ",
                    description: result.error || "فشل رفع الصورة",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "خطأ",
                description: "حدث خطأ أثناء رفع الصورة",
                variant: "destructive",
            });
        } finally {
            setIsUploadingIdentity(false);
        }
    };

    // Handle login
    const handleLogin = async () => {
        setServerError("");

        if (!loginData.email || !loginData.password) {
            setServerError("يرجى ملء جميع الحقول");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.needsVerification) {
                    setUserId(data.userId);
                    setStep("verify");
                    toast({
                        title: "تنبيه",
                        description: "يرجى التحقق من بريدك الإلكتروني أولاً",
                    });
                } else {
                    setServerError(data.error || "حدث خطأ");
                }
                return;
            }

            toast({
                title: "مرحباً بك",
                description: "تم تسجيل الدخول بنجاح",
            });

            // A regular login replaces any active demo identity.
            clearDemoSession();

            // Store user and token in localStorage
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            onClose();
            window.location.reload();
        } catch {
            setServerError("حدث خطأ في الاتصال");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle register
    const handleRegister = async () => {
        setServerError("");
        setValidationErrors([]);

        // Local validation
        if (!validateRegisterForm()) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: registerData.name,
                    email: registerData.email,
                    password: registerData.password,
                    phone: registerData.phone,
                    address: registerData.address,
                    role: "CUSTOMER",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setServerError(data.error || "حدث خطأ أثناء إنشاء الحساب");

                // Show additional details if available
                if (data.details && Array.isArray(data.details)) {
                    setValidationErrors(data.details);
                }
                return;
            }

            setUserId(data.userId);
            setStep("verify");
            toast({
                title: "تم إنشاء الحساب",
                description: "يرجى إدخال كود التحقق المرسل لبريدك",
            });

            // For testing - show the code
            if (data.verificationCode) {
                console.log("Verification Code:", data.verificationCode);
            }
        } catch {
            setServerError("حدث خطأ في الاتصال");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle merchant registration
    const handleMerchantRegister = async () => {
        setServerError("");
        setValidationErrors([]);

        // Local validation
        if (!validateMerchantForm()) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/merchants/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(merchantData),
            });

            const data = await response.json();

            if (!response.ok) {
                setServerError(data.error || "حدث خطأ أثناء تسجيل التاجر");
                if (data.details && Array.isArray(data.details)) {
                    setValidationErrors(data.details);
                }
                return;
            }

            if (data.requiresVerification) {
                setUserId(data.userId);
                setIsMerchantVerify(true);
                setStep("verify");
                toast({
                    title: "تم إنشاء الحساب",
                    description: "يرجى إدخال كود التحقق المرسل لبريدك",
                });

                // For testing - show the code
                if (data.verificationCode) {
                    console.log("Verification Code:", data.verificationCode);
                }
            } else {
                toast({
                    title: "تم إرسال الطلب",
                    description: "تم إرسال طلبك بنجاح، سيتم مراجعته من الإدارة",
                });

                onClose();
                setActiveTab("login");
            }
        } catch {
            setServerError("حدث خطأ في الاتصال");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle verification
    const handleVerify = async () => {
        const code = verificationCode.join("");
        if (code.length !== 6) {
            setServerError("يرجى إدخال الكود كاملاً");
            return;
        }

        setIsLoading(true);
        setServerError("");
        try {
            const response = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    code,
                    type: "EMAIL_VERIFICATION",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setServerError(data.error || "الكود غير صحيح");
                return;
            }

            if (isMerchantVerify) {
                toast({
                    title: "تم التحقق بنجاح",
                    description: "حسابك الآن قيد مراجعة الإدارة، سيتم إشعارك بالبريد عند التفعيل",
                });
                setIsMerchantVerify(false);
                onClose();
                setStep("form");
                setActiveTab("login");
            } else {
                toast({
                    title: "تم التحقق",
                    description: "تم التحقق من بريدك الإلكتروني بنجاح",
                });

                onClose();
                setStep("form");
                setActiveTab("login");
            }
        } catch {
            setServerError("حدث خطأ في الاتصال");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle resend code
    const handleResendCode = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/verify", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, type: "EMAIL_VERIFICATION" }),
            });

            const data = await response.json();

            if (!response.ok) {
                setServerError(data.error || "حدث خطأ");
                return;
            }

            toast({
                title: "تم الإرسال",
                description: "تم إرسال كود جديد لبريدك",
            });

            if (data.verificationCode) {
                console.log("New Verification Code:", data.verificationCode);
            }
        } catch {
            setServerError("حدث خطأ في الاتصال");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle forgot password
    const handleForgotPassword = async () => {
        if (!resetEmail) {
            setServerError("يرجى إدخال البريد الإلكتروني");
            return;
        }

        setIsLoading(true);
        setServerError("");
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: resetEmail }),
            });

            const data = await response.json();

            if (data.userId) {
                setResetUserId(data.userId);
            }

            setResetStep("verify");
            toast({
                title: "تم الإرسال",
                description: data.message,
            });

            if (data.verificationCode) {
                console.log("Reset Code:", data.verificationCode);
            }
        } catch {
            setServerError("حدث خطأ");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle reset password
    const handleResetPassword = async () => {
        const code = verificationCode.join("");
        if (code.length !== 6 || !newPassword) {
            setServerError("يرجى ملء جميع الحقول");
            return;
        }

        setIsLoading(true);
        setServerError("");
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: resetUserId,
                    code,
                    newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setServerError(data.error || "حدث خطأ");
                return;
            }

            setResetStep("success");
            toast({
                title: "تم",
                description: "تم إعادة تعيين كلمة المرور بنجاح",
            });
        } catch {
            setServerError("حدث خطأ");
        } finally {
            setIsLoading(false);
        }
    };

    // OTP Input handler
    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;

        const newOtp = [...verificationCode];
        newOtp[index] = value;
        setVerificationCode(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    // Reset state on close
    const handleClose = () => {
        setStep("form");
        setVerificationCode(["", "", "", "", "", ""]);
        setShowForgotPassword(false);
        setResetStep("email");
        setValidationErrors([]);
        setServerError("");
        setIsMerchantVerify(false);
        onClose();
    };

    // Password strength indicator
    const passwordStrength = checkPasswordStrength(registerData.password);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-lg border-[var(--gold)]/20 max-h-[90vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                    {showForgotPassword ? (
                        <motion.div
                            key="forgot"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <DialogHeader>
                                <DialogTitle className="text-xl text-center">
                                    استعادة كلمة المرور
                                </DialogTitle>
                                <DialogDescription className="text-center">
                                    {resetStep === "email" && "أدخلي بريدك الإلكتروني لاستعادة كلمة المرور"}
                                    {resetStep === "verify" && "أدخلي الكود المرسل لبريدك وكلمة المرور الجديدة"}
                                    {resetStep === "success" && "تم إعادة تعيين كلمة المرور بنجاح"}
                                </DialogDescription>
                            </DialogHeader>

                            {/* Error Alert */}
                            {serverError && (
                                <Alert variant="destructive" className="mt-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{serverError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="mt-4 space-y-4">
                                {resetStep === "email" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>البريد الإلكتروني</Label>
                                            <div className="relative">
                                                <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="email"
                                                    placeholder="example@email.com"
                                                    value={resetEmail}
                                                    onChange={(e) => setResetEmail(e.target.value)}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleForgotPassword}
                                            disabled={isLoading}
                                            className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "إرسال"}
                                        </Button>
                                    </>
                                )}

                                {resetStep === "verify" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label className="text-center block">كود التحقق</Label>
                                            <div className="flex gap-2 justify-center" dir="ltr">
                                                {verificationCode.map((digit, index) => (
                                                    <Input
                                                        key={index}
                                                        id={`otp-${index}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                                        className="w-12 h-12 text-center text-xl font-bold border-[var(--gold)]/30 focus:border-[var(--gold)]"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>كلمة المرور الجديدة</Label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleResetPassword}
                                            disabled={isLoading}
                                            className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "تأكيد"}
                                        </Button>
                                    </>
                                )}

                                {resetStep === "success" && (
                                    <div className="text-center py-6">
                                        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                                        <p className="text-gray-600">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
                                        <Button
                                            onClick={() => {
                                                setShowForgotPassword(false);
                                                setResetStep("email");
                                            }}
                                            className="mt-4 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                                        >
                                            تسجيل الدخول
                                        </Button>
                                    </div>
                                )}

                                {resetStep !== "success" && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setResetStep("email");
                                            setServerError("");
                                        }}
                                        className="w-full"
                                    >
                                        <ArrowLeft className="h-4 w-4 ml-2" />
                                        العودة لتسجيل الدخول
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ) : step === "verify" ? (
                        <motion.div
                            key="verify"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <DialogHeader>
                                <DialogTitle className="text-xl text-center">
                                    تحقق من بريدك
                                </DialogTitle>
                                <DialogDescription className="text-center">
                                    أدخلي الكود المكون من 6 أرقام المرسل لبريدك الإلكتروني
                                </DialogDescription>
                            </DialogHeader>

                            {/* Error Alert */}
                            {serverError && (
                                <Alert variant="destructive" className="mt-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{serverError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="mt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-center block">كود التحقق</Label>
                                    <div className="flex gap-2 justify-center" dir="ltr">
                                        {verificationCode.map((digit, index) => (
                                            <Input
                                                key={index}
                                                id={`otp-${index}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                className="w-12 h-12 text-center text-xl font-bold border-[var(--gold)]/30 focus:border-[var(--gold)]"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleVerify}
                                    disabled={isLoading}
                                    className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                                >
                                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "تحقق"}
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={handleResendCode}
                                    disabled={isLoading}
                                    className="w-full text-[var(--gold)]"
                                >
                                    لم يصلك الكود؟ إعادة الإرسال
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <Tabs value={activeTab} onValueChange={handleTabChange}>
                                <TabsList className="grid w-full grid-cols-3 mb-4">
                                    <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                                    <TabsTrigger value="register">حساب جديد</TabsTrigger>
                                    <TabsTrigger value="merchant">تسجيل تاجر</TabsTrigger>
                                </TabsList>

                                {/* Server Error Alert */}
                                {serverError && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{serverError}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Validation Errors */}
                                {validationErrors.length > 0 && (
                                    <Alert className="mb-4 border-yellow-500 bg-yellow-50">
                                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                                        <AlertDescription className="text-yellow-800">
                                            <ul className="list-disc list-inside space-y-1">
                                                {validationErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Login Tab */}
                                <TabsContent value="login" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>البريد الإلكتروني</Label>
                                        <div className="relative">
                                            <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="email"
                                                placeholder="example@email.com"
                                                value={loginData.email}
                                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>كلمة المرور</Label>
                                        <div className="relative">
                                            <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                value={loginData.password}
                                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleLogin}
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)]"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "تسجيل الدخول"}
                                    </Button>

                                    {/* Google OAuth Button */}
                                    <div className="relative my-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white px-2 text-gray-500">أو</span>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-gray-300 hover:bg-gray-50"
                                        onClick={() => {
                                            window.location.href = "/api/auth/google";
                                        }}
                                    >
                                        <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        المتابعة بواسطة Google
                                    </Button>

                                    <Button
                                        variant="link"
                                        onClick={() => {
                                            setShowForgotPassword(true);
                                            setServerError("");
                                        }}
                                        className="w-full text-[var(--gold-dark)]"
                                    >
                                        نسيت كلمة المرور؟
                                    </Button>
                                </TabsContent>

                                {/* Register Tab */}
                                <TabsContent value="register" className="space-y-3">
                                    {/* Info Alert for password requirements */}
                                    <Alert className="bg-blue-50 border-blue-200">
                                        <Info className="h-4 w-4 text-blue-600" />
                                        <AlertDescription className="text-blue-800 text-xs">
                                            كلمة المرور يجب أن تحتوي على: 8 أحرف، حرف كبير، حرف صغير، ورقم
                                        </AlertDescription>
                                    </Alert>

                                    <div className="space-y-2">
                                        <Label>الاسم الكامل *</Label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="text"
                                                placeholder="الاسم الكامل"
                                                value={registerData.name}
                                                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>البريد الإلكتروني *</Label>
                                        <div className="relative">
                                            <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="email"
                                                placeholder="example@email.com"
                                                value={registerData.email}
                                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>كلمة المرور *</Label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={registerData.password}
                                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>تأكيد كلمة المرور *</Label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={registerData.confirmPassword}
                                                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password Strength Indicator */}
                                    {registerData.password && (
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex gap-1 mb-2">
                                                {[1, 2, 3, 4, 5].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-1 flex-1 rounded-full ${passwordStrength.score >= level
                                                            ? passwordStrength.score <= 2
                                                                ? "bg-red-500"
                                                                : passwordStrength.score <= 3
                                                                    ? "bg-yellow-500"
                                                                    : "bg-green-500"
                                                            : "bg-gray-200"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                {passwordStrength.checks.map((check, index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center gap-1 ${check.passed ? "text-green-600" : "text-gray-400"
                                                            }`}
                                                    >
                                                        {check.passed ? (
                                                            <CheckCircle className="h-3 w-3" />
                                                        ) : (
                                                            <XCircle className="h-3 w-3" />
                                                        )}
                                                        {check.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>رقم الهاتف *</Label>
                                        <div className="relative">
                                            <Phone className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="tel"
                                                placeholder="+967XXXXXXXXX أو 05XXXXXXXX"
                                                value={registerData.phone}
                                                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            مثال: +967712345678 (يمني) أو 0512345678 (سعودي)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>العنوان (اختياري)</Label>
                                        <div className="relative">
                                            <MapPin className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="text"
                                                placeholder="المدينة، الحي"
                                                value={registerData.address}
                                                onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleRegister}
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)]"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "إنشاء حساب"}
                                    </Button>
                                </TabsContent>

                                {/* Merchant Tab */}
                                <TabsContent value="merchant" className="space-y-3">
                                    <Alert className="bg-amber-50 border-amber-200">
                                        <Info className="h-4 w-4 text-amber-600" />
                                        <AlertDescription className="text-amber-800 text-xs">
                                            بعد إرسال الطلب، سيتم مراجعته من الإدارة خلال 24-48 ساعة
                                        </AlertDescription>
                                    </Alert>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>اسم المحل *</Label>
                                            <div className="relative">
                                                <Store className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="text"
                                                    placeholder="اسم المحل"
                                                    value={merchantData.storeName}
                                                    onChange={(e) => setMerchantData({ ...merchantData, storeName: e.target.value })}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>نوع المنتجات *</Label>
                                            <Input
                                                type="text"
                                                placeholder="مثال: ملابس، عطور، إكسسوارات"
                                                value={merchantData.storeType}
                                                onChange={(e) => setMerchantData({ ...merchantData, storeType: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>الاسم الكامل *</Label>
                                            <div className="relative">
                                                <User className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="text"
                                                    placeholder="الاسم الكامل"
                                                    value={merchantData.fullName}
                                                    onChange={(e) => setMerchantData({ ...merchantData, fullName: e.target.value })}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>رقم الهاتف *</Label>
                                            <div className="relative">
                                                <Phone className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="tel"
                                                    placeholder="+967XXXXXXXXX"
                                                    value={merchantData.phone}
                                                    onChange={(e) => setMerchantData({ ...merchantData, phone: e.target.value })}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>البريد الإلكتروني *</Label>
                                        <div className="relative">
                                            <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="email"
                                                placeholder="merchant@email.com"
                                                value={merchantData.email}
                                                onChange={(e) => setMerchantData({ ...merchantData, email: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>عنوان المحل *</Label>
                                        <div className="relative">
                                            <MapPin className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                            <Input
                                                type="text"
                                                placeholder="المدينة، الحي، اسم الشارع"
                                                value={merchantData.address}
                                                onChange={(e) => setMerchantData({ ...merchantData, address: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>كلمة المرور *</Label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={merchantData.password}
                                                    onChange={(e) => setMerchantData({ ...merchantData, password: e.target.value })}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>تأكيد كلمة المرور *</Label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={merchantData.confirmPassword}
                                                    onChange={(e) => setMerchantData({ ...merchantData, confirmPassword: e.target.value })}
                                                    className="pr-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Merchant Password Strength Indicator */}
                                    {merchantData.password && (
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex gap-1 mb-2">
                                                {[1, 2, 3, 4, 5].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-1 flex-1 rounded-full ${checkPasswordStrength(merchantData.password).score >= level
                                                            ? checkPasswordStrength(merchantData.password).score <= 2
                                                                ? "bg-red-500"
                                                                : checkPasswordStrength(merchantData.password).score <= 3
                                                                    ? "bg-yellow-500"
                                                                    : "bg-green-500"
                                                            : "bg-gray-200"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs">
                                                {checkPasswordStrength(merchantData.password).checks.map((check, index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex items-center gap-1 ${check.passed ? "text-green-600" : "text-gray-400"
                                                            }`}
                                                    >
                                                        {check.passed ? (
                                                            <CheckCircle className="h-3 w-3" />
                                                        ) : (
                                                            <XCircle className="h-3 w-3" />
                                                        )}
                                                        {check.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Identity Card Image Upload */}
                                    <div className="space-y-2">
                                        <Label>صورة البطاقة الشخصية *</Label>

                                        {/* Image Preview */}
                                        {merchantData.identityCardImage && (
                                            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border mb-2">
                                                <img
                                                    src={merchantData.identityCardImage}
                                                    alt="صورة البطاقة"
                                                    className="w-full h-full object-contain"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 left-2"
                                                    onClick={() => setMerchantData({ ...merchantData, identityCardImage: "" })}
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Upload Buttons */}
                                        <div className="flex gap-2">
                                            {/* Camera Button */}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                id="identity-camera"
                                                className="hidden"
                                                onChange={handleIdentityImageUpload}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                disabled={isUploadingIdentity}
                                                onClick={() => document.getElementById('identity-camera')?.click()}
                                            >
                                                {isUploadingIdentity ? (
                                                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                                ) : (
                                                    <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                                كاميرا
                                            </Button>

                                            {/* Gallery Button */}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id="identity-gallery"
                                                className="hidden"
                                                onChange={handleIdentityImageUpload}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                disabled={isUploadingIdentity}
                                                onClick={() => document.getElementById('identity-gallery')?.click()}
                                            >
                                                {isUploadingIdentity ? (
                                                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                                ) : (
                                                    <Upload className="h-4 w-4 ml-2" />
                                                )}
                                                معرض الصور
                                            </Button>
                                        </div>

                                        <p className="text-xs text-gray-500">
                                            التقط صورة من الكاميرا أو اختر من معرض الصور (JPEG, PNG, WebP - حتى 5MB)
                                        </p>
                                    </div>

                                    <div className="border-t pt-3 mt-3">
                                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            بيانات الدفع (اختياري)
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label>محفظة جيب</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="رقم المحفظة"
                                                    value={merchantData.jeibWallet}
                                                    onChange={(e) => setMerchantData({ ...merchantData, jeibWallet: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>محفظة كاش</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="رقم المحفظة"
                                                    value={merchantData.kashWallet}
                                                    onChange={(e) => setMerchantData({ ...merchantData, kashWallet: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            <div className="space-y-2">
                                                <Label>محفظة جوالي</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="رقم المحفظة"
                                                    value={merchantData.jawaliWallet}
                                                    onChange={(e) => setMerchantData({ ...merchantData, jawaliWallet: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>معلومات الحوالة</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="رقم الحساب البنكي"
                                                    value={merchantData.transferInfo}
                                                    onChange={(e) => setMerchantData({ ...merchantData, transferInfo: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleMerchantRegister}
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "إرسال طلب التسجيل"}
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}