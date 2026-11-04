"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Truck,
  RefreshCw,
  HelpCircle,
  FileText,
  Shield,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthModals } from "@/components/auth/auth-modals";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { useCart } from "@/contexts/cart-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

const WHATSAPP_NUMBER = "967776080395";

function PoliciesContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "shipping";

  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "store">("store");

  const { state: cartState, clearCart } = useCart();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  };

  const policyTabs = [
    {
      id: "shipping",
      label: "الشحن والتوصيل",
      icon: Truck,
      content: <ShippingPolicy />,
    },
    {
      id: "returns",
      label: "الإرجاع والاستبدال",
      icon: RefreshCw,
      content: <ReturnsPolicy />,
    },
    {
      id: "faq",
      label: "الأسئلة الشائعة",
      icon: HelpCircle,
      content: <FAQPolicy />,
    },
    {
      id: "terms",
      label: "الشروط والأحكام",
      icon: FileText,
      content: <TermsPolicy />,
    },
    {
      id: "privacy",
      label: "سياسة الخصوصية",
      icon: Shield,
      content: <PrivacyPolicy />,
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
        <div className="animate-spin w-12 h-12 border-4 border-[#C9A962] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
      <Navbar
        user={user}
        onOpenCart={() => setIsCartOpen(true)}
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

      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        user={user}
        onCheckout={() => {
          if (!user) {
            setIsCartOpen(false);
            setIsAuthOpen(true);
          } else {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }
        }}
      />

      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.cart.items}
        userId={user?.id || ""}
        onSuccess={() => clearCart()}
      />

      <main className="flex-1 pt-28 md:pt-32 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
              سياسات المتجر
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
              سياسات زينة
            </h1>
            <p className="text-[#8B7355] max-w-2xl mx-auto text-lg">
              نلتزم بتقديم أفضل تجربة تسوق لك. تعرفي على سياساتنا المختلفة.
            </p>
          </motion.div>

          {/* Policy Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue={tabFromUrl} className="w-full">
              <TabsList className="bg-white/80 backdrop-blur-sm border border-[#E8E0D8] p-2 mb-8 flex-wrap h-auto gap-2 justify-center rounded-2xl">
                {policyTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C9A962] data-[state=active]:to-[#B8956E] data-[state=active]:text-white text-[#3D3021]"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {policyTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    dir="ltr"
                  >
                    {tab.content}
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16"
            dir="ltr"
          >
            <Card className="border-0 shadow-xl bg-gradient-to-r from-[#3D3021] to-[#4A3D2E] text-white">
              <CardContent className="p-8 md:p-12">
                <div className="text-center mb-8" dir="ltr">
                  <h3 className="text-2xl md:text-3xl font-bold mb-3">
                    هل لديكِ أي استفسار؟
                  </h3>
                  <p className="text-white/70">
                    فريق خدمة العملاء جاهز لمساعدتك
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-[#25D366] hover:bg-[#22C55E] text-white px-8 py-4 rounded-full font-medium transition-all duration-300 hover:scale-105"
                  >
                    <MessageCircle className="h-5 w-5" />
                    تواصل معنا عبر واتساب
                  </a>
                  <a
                    href="mailto:tarifa.store.ye@gmail.com"
                    className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-medium transition-all duration-300 hover:scale-105"
                  >
                    <Mail className="h-5 w-5" />
                    راسلنا عبر البريد
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Shipping Policy Component
function ShippingPolicy() {
  const policies = [
    {
      title: "نطاق التوصيل",
      description: "نوصل لجميع محافظات الجمهورية اليمنية",
      icon: MapPin,
    },
    {
      title: "مدة التوصيل",
      description: "من 2-5 أيام عمل حسب المحافظة",
      icon: Clock,
    },
    {
      title: "تكلفة التوصيل",
      description: "توصيل مجاني للطلبات فوق 25,000الف ريال",
      icon: CreditCard,
    },
    {
      title: "تتبع الطلب",
      description: "يمكنك متابعة حالة طلبك من حسابك",
      icon: Package,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {policies.map((policy, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            dir="ltr"
          >
            <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A962]/20 to-[#C9A962]/10 flex items-center justify-center mx-auto mb-4">
                  <policy.icon className="h-8 w-8 text-[#8B7355]" />
                </div>
                <h3 className="font-bold text-[#3D3021] mb-2">
                  {policy.title}
                </h3>
                <p className="text-[#8B7355] text-sm">{policy.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detailed Policy */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-[#3D3021] text-xl">
            تفاصيل سياسة الشحن والتوصيل
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-lg max-w-none text-[#5D5D5D]">
          <div className="space-y-6" dir="ltr">
            <div>
              <h4 className="font-bold text-[#3D3021] mb-2">أوقات التوصيل</h4>
              <p>
                نقوم بالتوصيل من يوم السبت إلى يوم الخميس، من الساعة 9 صباحاً
                حتى 6 مساءً.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#3D3021] mb-2">رسوم التوصيل</h4>
              <ul className="list-disc list-inside space-y-2">
                <li>داخل محافظة ذمار مجاني</li>
                <li>المحافظات القريبة (تعز، الحديدة، صنعاء): 2,500 ريال</li>
                <li>المحافظات البعيدة: 3,500 ريال</li>
                <li>توصيل مجاني للطلبات فوق 25,000الف ريال</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#3D3021] mb-2">متطلبات التوصيل</h4>
              <p>
                يرجى التأكد من صحة العنوان ورقم الهاتف. في حال عدم التمكن من
                التواصل معك، سيتم إرجاع الطلب بعد 3 محاولات.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#3D3021] mb-2">تغليف المنتجات</h4>
              <p>
                جميع منتجاتنا يتم تغليفها بعناية فائقة بعلب فاخرة للحفاظ على
                جودتها ووصولها إليك بحالة مثالية.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Returns Policy Component
function ReturnsPolicy() {
  const conditions = [
    { text: "المنتج بحالته الأصلية وغير مستخدم", allowed: true },
    { text: "المنتج في علبته الأصلية", allowed: true },
    { text: "المنتج يحتوي على جميع الملحقات", allowed: true },
    { text: "الطلب خلال 7 أيام من الاستلام", allowed: true },
    { text: "المنتج تم استخدامه", allowed: false },
    { text: "المنتج تالف بسبب سوء الاستخدام", allowed: false },
    { text: "المنتج خارج فترة الإرجاع", allowed: false },
  ];

  return (
    <div className="space-y-8" dir="ltr">
      {/* Return Period Banner */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-[#C9A962]/10 to-[#C9A962]/5">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-[#3D3021] mb-2">
            7 أيام للإرجاع
          </h3>
          <p className="text-[#8B7355] max-w-md mx-auto">
            يمكنك إرجاع أو استبدال المنتج خلال 7 أيام من تاريخ الاستلام
          </p>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-[#3D3021] text-xl">
            شروط الإرجاع والاستبدال
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3" dir="ltr">
            {conditions.map((condition, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-4 rounded-xl ${
                  condition.allowed ? "bg-green-50" : "bg-red-50"
                }`}
              >
                {condition.allowed ? (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                )}
                <span
                  className={
                    condition.allowed ? "text-green-800" : "text-red-800"
                  }
                >
                  {condition.text}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Return Process */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-[#3D3021] text-xl">
            كيفية الإرجاع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" dir="ltr">
            {[
              {
                step: 1,
                title: "التواصل معنا",
                desc: "راسلنا عبر واتساب أو البريد الإلكتروني",
              },
              {
                step: 2,
                title: "تقديم الطلب",
                desc: "قدم طلب الإرجاع مع رقم الطلب والسبب",
              },
              {
                step: 3,
                title: "انتظار التأكيد",
                desc: "سيتم مراجعة طلبك خلال 24 ساعة",
              },
              {
                step: 4,
                title: "إرسال المنتج",
                desc: "سيتم استلام المنتج منك أو إرساله لأقرب فرع",
              },
              {
                step: 5,
                title: "استرداد المبلغ",
                desc: "خلال 5-7 أيام عمل بعد استلام المنتج",
              },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center shrink-0 text-white font-bold"
                  dir="ltr"
                >
                  {item.step}
                </div>
                <div>
                  <h4 className="font-bold text-[#3D3021]">{item.title}</h4>
                  <p className="text-[#8B7355] text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div
        className="bg-yellow-50 border border-yellow-200 rounded-xl p-6"
        dir="ltr"
      >
        <h4 className="font-bold text-yellow-800 mb-2">ملاحظات هامة</h4>
        <ul className="text-yellow-700 text-sm space-y-2 list-disc list-inside">
          <li>
            المنتجات المباعة بخصم لا يمكن إرجاعها إلا في حال وجود عيب مصنعي
          </li>
          <li>تكلفة شحن الإرجاع يتحملها العميل إلا في حال وجود عيب</li>
          <li>يستغرق استرداد المبلغ من 5-7 أيام عمل</li>
        </ul>
      </div>
    </div>
  );
}

// FAQ Component
function FAQPolicy() {
  const faqs = [
    {
      question: "كيف يمكنني تتبع طلبي؟",
      answer:
        'يمكنك تتبع طلبك من خلال الدخول لحسابك واختيار "طلباتي". سيظهر لك حالة الطلب الحالية وآخر التحديثات.',
    },
    {
      question: "ما هي طرق الدفع المتاحة؟",
      answer:
        "نقبل الدفع عبر الحوالات المالية ومحافظ إلكترونية (جيب، كاش، جوالي). سيتم طلب الدفع عند تأكيد الطلب.",
    },
    {
      question: "هل يمكنني تعديل أو إلغاء طلبي؟",
      answer:
        "يمكنكِ تعديل أو إلغاء الطلب خلال ساعتين من تقديمه. بعد ذلك، يرجى التواصل مع خدمة العملاء.",
    },
    {
      question: "كيف أعرف أن المنتج أصلي؟",
      answer:
        "جميع منتجاتنا أصلية 100% مع ضمان الجودة. نوفر شهادات أصالة للمنتجات الفاخرة.",
    },
    {
      question: "هل يتم شحن الطلبات دولياً؟",
      answer:
        "حالياً نقوم بالتوصيل داخل اليمن فقط. للطلبات الدولية، يرجى التواصل معنا لترتيب الشحن.",
    },
    {
      question: "ماذا أفعل إذا استلمت منتج تالف؟",
      answer:
        "في حال استلام منتج تالف، يرجى التواصل معنا خلال 24 ساعة مع صور للضرر. سنستبدل المنتج فوراً.",
    },
    {
      question: "هل يمكنني تغيير عنوان التوصيل؟",
      answer:
        "يمكنك تغيير العنوان قبل شحن الطلب. يرجى التواصل مع خدمة العملاء في أسرع وقت.",
    },
    {
      question: "كيف أحصل على خصم؟",
      answer:
        "اشترك في نشرتنا البريدية للحصول على عروض حصرية. أيضاً نقدم خصم 10% لأول طلب.",
    },
  ];

  return (
    <div className="space-y-6" dir="ltr">
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-[#E8E0D8] rounded-xl px-4 data-[state=open]:bg-[#FAF7F2]"
              >
                <AccordionTrigger className="text-[#3D3021] font-semibold hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#5D5D5D] pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Still have questions */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-[#FAF7F2] to-white">
        <CardContent className="p-8 text-center">
          <HelpCircle className="h-12 w-12 text-[#C9A962] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#3D3021] mb-2">
            لم تجد إجابة لسؤالك؟
          </h3>
          <p className="text-[#8B7355] mb-4">
            فريقنا جاهز للإجابة على جميع استفساراتك
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#25D366] hover:underline"
            >
              <MessageCircle className="h-5 w-5" />
              واتساب
            </a>
            <span className="text-[#C9A962]">|</span>
            <a
              href="mailto:tarifa.store.ye@gmail.com"
              className="flex items-center gap-2 text-[#8B7355] hover:underline"
            >
              <Mail className="h-5 w-5" />
              البريد الإلكتروني
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Terms Policy Component
function TermsPolicy() {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-8 prose prose-lg max-w-none text-[#5D5D5D]">
          <div className="space-y-6" dir="ltr">
            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                1. قبول الشروط
              </h3>
              <p>
                باستخدامك لموقع زينة، فإنك توافق على الالتزام بهذه الشروط
                والأحكام. يرجى قراءتها بعناية.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                2. استخدام الموقع
              </h3>
              <p>يُسمح باستخدام الموقع للأغراض المشروعة فقط. يُحظر:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>استخدام الموقع بأي طريقة غير قانونية</li>
                <li>محاولة الوصول غير المصرح به لأي جزء من الموقع</li>
                <li>نقل فيروسات أو أي أكواد ضارة</li>
                <li>جمع معلومات المستخدمين دون إذن</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                3. الحسابات
              </h3>
              <p>عند إنشاء حساب، أنت مسؤول عن:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>الحفاظ على سرية كلمة المرور</li>
                <li>جميع الأنشطة التي تتم تحت حسابك</li>
                <li>تقديم معلومات صحيحة ودقيقة</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                4. المنتجات والأسعار
              </h3>
              <p>نسعى لعرض الأسعار والمعلومات الصحيحة. ومع ذلك:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>الأسعار قابلة للتغيير دون إشعار مسبق</li>
                <li>نحتفظ بالحق في تصحيح أي أخطاء في الأسعار</li>
                <li>صور المنتجات للعرض وقد تختلف قليلاً عن الواقع</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                5. الطلبات والدفع
              </h3>
              <p>عند تقديم طلب:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>أنت تؤكد رغبتك في شراء المنتجات المحددة</li>
                <li>يجب الدفع قبل شحن الطلب</li>
                <li>نحتفظ بالحق في رفض أي طلب</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                6. الملكية الفكرية
              </h3>
              <p>
                جميع المحتويات على الموقع (النصوص، الصور، الشعارات) محمية بموجب
                حقوق الملكية الفكرية ولا يجوز استخدامها دون إذن مسبق.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                7. التعديلات
              </h3>
              <p>
                نحتفظ بالحق في تعديل هذه الشروط في أي وقت. ستكون التعديلات سارية
                فور نشرها على الموقع.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                8. القانون الواجب التطبيق
              </h3>
              <p>تخضع هذه الشروط وتفسر وفقاً لقوانين الجمهورية اليمنية.</p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Privacy Policy Component
function PrivacyPolicy() {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-8 prose prose-lg max-w-none text-[#5D5D5D]">
          <div className="space-y-6" dir="ltr">
            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#C9A962]" />
                مقدمة
              </h3>
              <p>
                نحن في زينة نأخذ خصوصيتك على محمل الجد. سياسة الخصوصية هذه
                توضح كيفية جمع واستخدام وحماية معلوماتك الشخصية.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                المعلومات التي نجمعها
              </h3>
              <p>نقوم بجمع المعلومات التالية:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>معلومات الحساب:</strong> الاسم، البريد الإلكتروني، رقم
                  الهاتف
                </li>
                <li>
                  <strong>معلومات التوصيل:</strong> العنوان، المحافظة
                </li>
                <li>
                  <strong>معلومات الدفع:</strong> تفاصيل الدفع (مشفرة)
                </li>
                <li>
                  <strong>بيانات الاستخدام:</strong> الصفحات المزورة، وقت
                  الزيارة
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                كيف نستخدم معلوماتك
              </h3>
              <p>نستخدم معلوماتك لـ:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>معالجة وتوصيل طلباتك</li>
                <li>التواصل معك بشأن حسابك وطلباتك</li>
                <li>تحسين خدماتنا وتجربتك</li>
                <li>إرسال عروض وتحديثات (بموافقتك)</li>
                <li>منع الاحتيال وحماية أمن الموقع</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                حماية بياناتك
              </h3>
              <p>نتخذ إجراءات أمنية قوية لحماية بياناتك:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>تشفير البيانات الحساسة (SSL/TLS)</li>
                <li>تشفير كلمات المرور باستخدام bcrypt</li>
                <li>الوصول المحدود للبيانات</li>
                <li>نسخ احتياطية آمنة</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                مشاركة البيانات
              </h3>
              <p>لا نبيع أو نشارك بياناتك مع أطراف ثالثة إلا:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>مع شركاء التوصيل لتنفيذ طلباتك</li>
                <li>عند الضرورة القانونية</li>
                <li>بموافقتك الصريحة</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">حقوقك</h3>
              <p>لديك الحق في:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>الوصول إلى بياناتك الشخصية</li>
                <li>تصحيح أي معلومات غير دقيقة</li>
                <li>طلب حذف حسابك وبياناتك</li>
                <li>الاعتراض على معالجة بياناتك</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                ملفات تعريف الارتباط (Cookies)
              </h3>
              <p>
                نستخدم cookies لتحسين تجربتك. يمكنك تعطيلها من إعدادات المتصفح،
                لكن قد يؤثر ذلك على بعض وظائف الموقع.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                التحديثات
              </h3>
              <p>
                قد نقوم بتحديث سياسة الخصوصية. سنخطرك بأي تغييرات جوهرية عبر
                البريد الإلكتروني.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-[#3D3021] mb-3">
                تواصل معنا
              </h3>
              <p>لأي استفسارات حول الخصوصية:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>البريد الإلكتروني:nbrask711@gmail.com</li>
                <li>واتساب: +967 776 080 395</li>
              </ul>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main export with Suspense wrapper
export default function PoliciesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
          <div className="animate-spin w-12 h-12 border-4 border-[#C9A962] border-t-transparent rounded-full" />
        </div>
      }
    >
      <PoliciesContent />
    </Suspense>
  );
}
