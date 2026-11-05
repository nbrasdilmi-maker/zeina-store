"use client";
import { Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  Share2,
  MessageCircle,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Loader2,
  Plus,
  Minus,
  Check,
  Trash2,
  LogIn,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthModals } from "@/components/auth/auth-modals";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { ChatWidget } from "@/components/chat/chat-widget";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
  colors?: string; // تم تصحيح الكلمة لتصبح colors
  sizes?: string;
  videoUrl?: string;
  featuresAr?: string;
  usageAr?: string;
  ingredientsAr?: string;
  inStock?: boolean;
  estimatedDays?: number;
  isFeatured: boolean;
  agentId?: string; // 👈 أضف هذا السطر
  merchantId?: string; // 👈 وأضف هذا السطر
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    nameAr: string;
  };
}

interface RelatedProduct {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  category?: {
    nameAr: string;
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // أضف هذا السطر
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "store">("store");
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const {
    state: cartState,
    addItem: addToCart,
    isInCart,
    getItemQuantity,
    updateQuantity,
    clearCart,
  } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [productId]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      const allProducts = data.products || [];

      const foundProduct = allProducts.find((p: Product) => p.id === productId);
      if (foundProduct) {
        setProduct(foundProduct);
        const related = allProducts
          .filter(
            (p: Product) =>
              p.categoryId === foundProduct.categoryId &&
              p.id !== foundProduct.id,
          )
          .slice(0, 4);
        setRelatedProducts(related);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?productId=${productId}`);
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "تنبيه",
        description: "يرجى تسجيل الدخول أولاً للتقييم",
        variant: "destructive",
      });
      setIsAuthOpen(true);
      return;
    }
    setIsSubmittingReview(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId,
          userId: user.id,
          rating: userRating,
          comment: userComment,
        }),
      });
      if (response.ok) {
        toast({ title: "تم بنجاح", description: "شكراً لتقييمك الرائع!" });
        setUserComment("");
        fetchReviews();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل إرسال التقييم",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };
  // دالة حذف التقييم (للإدارة وصاحب المنتج)
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم نهائياً؟")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reviews`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId }), // نرسل المعرف في الـ Body كما عدلناها في السيرفر
      });

      if (res.ok) {
        toast({ title: "تم الحذف", description: "تم مسح التقييم بنجاح." });
        // تحديث الواجهة فوراً لإخفاء التقييم المحذوف
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        const data = await res.json();
        toast({
          title: "خطأ",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل الاتصال بالسيرفر",
        variant: "destructive",
      });
    }
  };
  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} ر.ي`;
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    // 1. جلب الألوان لمعرفة إذا كان المنتج يتطلب اختيار لون
    let availableColors: string[] = [];
    if (product.colors) {
      try {
        availableColors =
          typeof product.colors === "string"
            ? JSON.parse(product.colors)
            : product.colors;
      } catch (e) {
        availableColors = [];
      }
    }

    // 3. إضافة المنتج للسلة مع اللون المختار
    addToCart({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.mainImage,
      quantity: quantity,
      stock: product.stock,
      color: selectedColor,
      size: selectedSize,
    });

    toast({
      title: "تمت الإضافة",
      description: "تم إضافة المنتج للسلة بنجاح",
    });
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleWishlist({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.mainImage,
    });
    toast({
      title: isInWishlist(product.id) ? "تمت الإزالة" : "تمت الإضافة",
      description: isInWishlist(product.id)
        ? "تم إزالة المنتج من المفضلة"
        : "تم إضافة المنتج للمفضلة",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  const handleShare = async () => {
    if (!product) return;

    const shareData = {
      title: product.nameAr,
      text: `${product.nameAr} - ${formatPrice(product.price)}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "تم النسخ",
        description: "تم نسخ رابط المنتج",
      });
    }
  };

  // Parse images

  // 1. معالجة الصور المتعددة (ضمان العرض حتى لو البيانات معقدة)
  const productImages = useMemo(() => {
    if (!product) return [];
    try {
      if (Array.isArray(product.images)) return product.images;
      if (
        typeof product.images === "string" &&
        product.images.startsWith("[")
      ) {
        return JSON.parse(product.images);
      }
      return product.mainImage ? [product.mainImage] : [];
    } catch (e) {
      return product.mainImage ? [product.mainImage] : [];
    }
  }, [product]);

  // --- مترجم الألوان (لتحويل الاسم العربي إلى شكل لوني) ---
  const ARABIC_COLOR_MAP: { [key: string]: string } = {
    أحمر: "#FF0000",
    أزرق: "#0000FF",
    "أزرق غامق": "#00008B",
    كحلي: "#000080",
    أخضر: "#008000",
    زيتوني: "#808000",
    أصفر: "#FFFF00",
    أسود: "#000000",
    أبيض: "#FFFFFF",
    رمادي: "#808080",
    بني: "#A52A2A",
    عودي: "#800000",
    "بني شوكولاتة": "#D2691E",
    سكري: "#FFFDD0",
    ذهبي: "#FFD700",
    فضي: "#C0C0C0",
    وردي: "#FFC0CB",
    بنفسجي: "#800080",
    برتقالي: "#FFA500",
    بيج: "#F5F5DC",
  };

  const productColors = useMemo(() => {
    if (!product?.colors) return [];
    try {
      let parsedData: any = product.colors;

      if (typeof product.colors === "string") {
        if (product.colors.startsWith("[")) {
          parsedData = JSON.parse(product.colors);
        } else {
          parsedData = product.colors
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c !== "");
        }
      }

      if (Array.isArray(parsedData)) {
        return parsedData
          .map((item) => {
            let label = "";
            if (typeof item === "object" && item !== null) {
              label = item.label || item.value || item.name || item.color || "";
            } else {
              label = String(item);
            }
            const hex = ARABIC_COLOR_MAP[label.trim()] || null;
            return { label, hex };
          })
          .filter((item) => item.label !== "");
      }

      const label = String(parsedData);
      const hex = ARABIC_COLOR_MAP[label.trim()] || null;
      return [{ label, hex }];
    } catch (e) {
      console.error("Error parsing colors:", e);
      return [];
    }
  }, [product]);
  const productSizes = useMemo(() => {
    if (!product?.sizes) return [];
    try {
      if (typeof product.sizes === "string" && product.sizes.startsWith("[")) {
        return JSON.parse(product.sizes);
      }
      if (Array.isArray(product.sizes)) return product.sizes;
      return product.sizes
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    } catch (e) {
      console.error("Error parsing sizes:", e);
      return [];
    }
  }, [product]);

  if (isLoading) {
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
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#C9A962]" />
        </div>
      </div>
    );
  }

  if (!product) {
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
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-2xl mb-4 text-[#3D3021]">المنتج غير موجود</p>
          <Link href="/products">
            <Button className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white">
              العودة للمنتجات
            </Button>
          </Link>
        </div>
        <Footer />
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
          setIsCartOpen(false);
          if (!user && !isGuestCheckoutEnabled()) {
            setIsAuthOpen(true);
            return;
          }
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.cart.items}
        userId={user?.id || ""}
        onSuccess={() => clearCart()}
      />

      {/* Breadcrumb */}
      <main className="flex-1 pt-28 md:pt-32">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-[#8B7355]">
            <Link href="/" className="hover:text-[#C9A962] transition-colors">
              الرئيسية
            </Link>
            <ChevronLeft className="h-4 w-4" />
            <Link
              href="/products"
              className="hover:text-[#C9A962] transition-colors"
            >
              المنتجات
            </Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[#C9A962]">{product.nameAr}</span>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-xl border border-[#E8E0D8]">
                <img
                  src={productImages[selectedImage] || product.mainImage}
                  alt={product.nameAr}
                  className="w-full h-full object-cover"
                />
                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {product.isFeatured && (
                    <Badge className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white text-sm px-3 py-1">
                      <Star className="h-4 w-4 ml-1" />
                      مميز
                    </Badge>
                  )}
                  {product.originalPrice &&
                    product.originalPrice > product.price && (
                      <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm px-3 py-1">
                        خصم{" "}
                        {Math.round(
                          (1 - product.price / product.originalPrice) * 100,
                        )}
                        %
                      </Badge>
                    )}
                </div>
                {/* Stock Badge */}
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge className="bg-red-500 text-white text-xl px-6 py-2">
                      نفذت الكمية
                    </Badge>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {Array.isArray(productImages) && productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {productImages.map((img: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                        selectedImage === index
                          ? "border-[#C9A962] shadow-lg"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.nameAr} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Category */}
              {product.category && (
                <Link
                  href={`/products?category=${product.category.id}`}
                  className="inline-block text-sm text-[#C9A962] hover:underline"
                >
                  {product.category.nameAr}
                </Link>
              )}

              {/* Title */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#3D3021]">
                  {product.nameAr}
                </h1>
                <p className="text-[#8B7355]">{product.name}</p>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-[#8B7355]">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <span className="text-2xl text-[#A69B8D] line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
              </div>

              {/* Stock Status & Delivery Time (مطور بناءً على الخطة) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${product.stock > 0 ? "bg-green-500" : "bg-orange-500"}`}
                  ></span>
                  <span
                    className={`font-bold ${product.stock > 0 ? "text-green-600" : "text-orange-600"}`}
                  >
                    {product.stock > 0
                      ? `متوفر في المخزن (${product.stock} قطعة)`
                      : "سيتم طلبه من أجلك (غير متوفر بالمخزن)"}
                  </span>
                </div>

                {/* إشعار مدة التوصيل الذكي */}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {product.stock > 0
                      ? "مدة التوصيل المتوقعة: من يوم إلى 3 أيام عمل."
                      : "مدة التوصيل المتوقعة: من أسبوع إلى 3 أسابيع."}
                  </p>
                </div>
              </div>

              <Separator className="bg-[#E8E0D8]" />

              {/* Description */}
              {product.descriptionAr && (
                <div>
                  <h3 className="font-bold mb-2 text-[#3D3021]">الوصف</h3>
                  <p className="text-[#5D5D5D] leading-relaxed">
                    {product.descriptionAr}
                  </p>
                </div>
              )}
              {/* الأزرار الهجينة (شكل اللون + اسمه) */}
              {productColors && productColors.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-bold text-[#3D3021]">اللون المتوفر:</h3>
                  <div className="flex flex-wrap gap-3">
                    {productColors.map((colorItem: any, index: number) => (
                      <button
                        key={`${colorItem.label}-${index}`}
                        type="button"
                        onClick={() => setSelectedColor(colorItem.label)}
                        className={`relative px-4 py-2.5 rounded-full border-2 transition-all flex items-center justify-center gap-3 font-medium min-w-[120px] ${
                          selectedColor === colorItem.label
                            ? "border-[#C9A962] bg-[#FAF7F2] text-[#C9A962] shadow-sm"
                            : "border-[#E8E0D8] text-[#5D5D5D] hover:border-[#C9A962]/50 hover:bg-gray-50"
                        }`}
                      >
                        {colorItem.hex ? (
                          <span
                            className="w-6 h-6 rounded-full border border-black/10 flex-shrink-0"
                            style={{ backgroundColor: colorItem.hex }}
                            title={colorItem.label}
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full border border-dashed border-gray-300 bg-gray-100 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-right">
                          {colorItem.label}
                        </span>
                        {selectedColor === colorItem.label && (
                          <Check className="h-4 w-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* اختيار المقاسات (أزرار أنيقة) */}
              {productSizes && productSizes.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-bold text-[#3D3021]">
                    المقاس / الحجم المتوفر:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {productSizes.map((size: string, index: number) => (
                      <button
                        key={`${size}-${index}`}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`px-5 py-2 rounded-xl border-2 transition-all font-bold text-sm ${
                          selectedSize === size
                            ? "border-[#C9A962] bg-[#C9A962] text-white shadow-md scale-105"
                            : "border-[#E8E0D8] text-[#5D5D5D] hover:border-[#C9A962]/50 bg-white"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {selectedSize && (
                    <p className="text-xs text-[#C9A962] font-medium">
                      المقاس المختار: {selectedSize}
                    </p>
                  )}
                </div>
              )}
              {/* Quantity Selector */}
              {product.stock > 0 && (
                <div className="flex items-center gap-4">
                  <span className="font-medium text-[#3D3021]">الكمية:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 border-[#C9A962]"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-bold text-lg">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 border-[#C9A962]"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Separator className="bg-[#E8E0D8]" />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white text-lg py-6 rounded-full"
                  disabled={product.stock === 0}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  {isInCart(product.id) ? "تحديث السلة" : "أضف للسلة"}
                </Button>
                {/* زر الاستفسار الذكي */}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full py-6 rounded-full border-[#C9A962] text-[#3D3021] hover:bg-[#FAF7F2] gap-2 font-bold shadow-sm"
                  onClick={() => {
                    if (!user) {
                      toast({
                        title: "تسجيل الدخول مطلوب",
                        description: "يرجى تسجيل الدخول للاستفسار عن المنتج",
                        variant: "destructive",
                      });
                      setIsAuthOpen(true);
                      return;
                    }

                    // 🚀 إطلاق الإشارة اللاسلكية لفتح النافذة العائمة وبدء المحادثة فوراً
                    window.dispatchEvent(new CustomEvent("start-inquiry"));
                  }}
                >
                  <MessageCircle className="h-5 w-5 text-[#C9A962]" />
                  استفسر عن هذا المنتج
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className={`py-5 rounded-full ${isInWishlist(product.id) ? "border-rose-400 text-rose-500" : "border-[#C9A962] text-[#8B7355]"}`}
                    onClick={handleToggleWishlist}
                  >
                    <Heart
                      className={`h-5 w-5 ml-2 ${isInWishlist(product.id) ? "fill-rose-500" : ""}`}
                    />
                    {isInWishlist(product.id) ? "في المفضلة" : "أضف للمفضلة"}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="py-5 rounded-full border-[#C9A962] text-[#8B7355]"
                    onClick={handleShare}
                  >
                    <Share2 className="h-5 w-5 ml-2" />
                    مشاركة
                  </Button>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center p-4 bg-white rounded-xl shadow-md border border-[#E8E0D8]">
                  <Truck className="h-8 w-8 mx-auto text-[#C9A962] mb-2" />
                  <p className="text-sm font-medium text-[#3D3021]">
                    توصيل سريع
                  </p>
                  <p className="text-xs text-[#8B7355]">لجميع المحافظات</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-md border border-[#E8E0D8]">
                  <Shield className="h-8 w-8 mx-auto text-[#C9A962] mb-2" />
                  <p className="text-sm font-medium text-[#3D3021]">
                    منتجات أصلية
                  </p>
                  <p className="text-xs text-[#8B7355]">ضمان الجودة</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-md border border-[#E8E0D8]">
                  <RotateCcw className="h-8 w-8 mx-auto text-[#C9A962] mb-2" />
                  <p className="text-sm font-medium text-[#3D3021]">
                    استبدال سهل
                  </p>
                  <p className="text-xs text-[#8B7355]">خلال 7 أيام</p>
                </div>
              </div>
              {/* عرض فيديو الريلز / المنتج (النسخة الذكية) */}
              {product.videoUrl && (
                <div className="space-y-3 pt-6 border-t border-[#E8E0D8] mt-6">
                  <h3 className="font-bold text-[#3D3021] flex items-center gap-2">
                    <span className="text-pink-500">📷</span> شاهد المنتج على
                    الطبيعة
                  </h3>
                  <div className="relative aspect-[9/16] max-w-[320px] mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-gray-50">
                    {/\.(mp4|webm|ogg)(\?|$)/i.test(product.videoUrl) ||
                    product.videoUrl.startsWith("/products/videos/") ? (
                      <video
                        src={product.videoUrl}
                        poster={product.mainImage}
                        controls
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <iframe
                        src={`https://www.instagram.com/reel/${product.videoUrl.split("/reels/")[1]?.split("/")[0] || product.videoUrl.split("/reel/")[1]?.split("/")[0] || product.videoUrl.split("/p/")[1]?.split("/")[0]}/embed/`}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        scrolling="no"
                        allowTransparency={true}
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      ></iframe>
                    )}
                  </div>
                  <p className="text-[10px] text-center text-gray-400">
                    فيديو حقيقي من صفحة زينة على فيسبوك
                  </p>
                </div>
              )}
              {/* تفاصيل المنتج الإضافية (الأكورديون الفخم) */}
              {(product.featuresAr ||
                product.usageAr ||
                product.ingredientsAr) && (
                <div className="pt-6 border-t border-[#E8E0D8] mt-6">
                  <Accordion type="single" collapsible className="w-full">
                    {product.featuresAr && (
                      <AccordionItem
                        value="features"
                        className="border-b border-[#E8E0D8]"
                      >
                        <AccordionTrigger className="text-[#3D3021] font-bold hover:text-[#C9A962] transition-colors">
                          <span className="flex items-center gap-2 text-base">
                            ✨ المميزات والفوائد
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-[#5D5D5D] leading-relaxed text-sm whitespace-pre-line py-4 px-2 bg-white/30 rounded-lg">
                          {product.featuresAr}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {product.usageAr && (
                      <AccordionItem
                        value="usage"
                        className="border-b border-[#E8E0D8]"
                      >
                        <AccordionTrigger className="text-[#3D3021] font-bold hover:text-[#C9A962] transition-colors">
                          <span className="flex items-center gap-2 text-base">
                            📝 طريقة الاستخدام
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-[#5D5D5D] leading-relaxed text-sm whitespace-pre-line py-4 px-2 bg-white/30 rounded-lg">
                          {product.usageAr}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {product.ingredientsAr && (
                      <AccordionItem value="ingredients" className="border-0">
                        <AccordionTrigger className="text-[#3D3021] font-bold hover:text-[#C9A962] transition-colors">
                          <span className="flex items-center gap-2 text-base">
                            🧪 المكونات
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-[#5D5D5D] leading-relaxed text-sm whitespace-pre-line py-4 px-2 bg-white/30 rounded-lg">
                          {product.ingredientsAr}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              )}

              {/* قسم التقييمات والتعليقات - يظهر للجميع لتعزيز الثقة وتحفيز الشراء */}
              <div className="pt-10 border-t border-[#E8E0D8] mt-10 space-y-8">
                {/* رأس القسم: العنوان وعدد التقييمات */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-[#3D3021]">
                      آراء العملاء ⭐
                    </h2>
                    <p className="text-xs text-[#8B7355]">
                      ماذا يقول جيراننا عن هذا المنتج
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[#C9A962] border-[#C9A962] px-4 py-1.5 bg-white shadow-sm font-bold"
                  >
                    {reviews.length} تقييمات
                  </Badge>
                </div>

                {/* قائمة التعليقات: تظهر للزوار والمسجلين لزيادة المصداقية */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {reviews.length > 0 ? (
                    reviews.map((rev, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-[#F5EFE6] hover:border-[#C9A962]/30 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#C9A962] font-bold border border-[#E8E0D8]">
                              {(rev.user?.name || "ع")[0]}
                            </div>
                            <div>
                              <p className="font-bold text-[#3D3021] text-sm">
                                {rev.user?.name || "عميل ترفة"}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex text-yellow-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${i < rev.rating ? "fill-yellow-400" : "text-gray-200"}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[9px] text-gray-400">
                                  {new Date(rev.createdAt).toLocaleDateString(
                                    "ar-YE",
                                    { day: "numeric", month: "long" },
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* علامة "مشتري مؤكد" اختيارية */}
                            <Badge className="bg-green-50 text-green-600 border-green-100 text-[9px] px-2 h-6">
                              <Check className="h-3 w-3 ml-0.5" /> مشتري مؤكد
                            </Badge>

                            {/* زر الحذف يظهر فقط للإدارة وصاحب المنتج والمندوب */}
                            {(user?.role === "ADMIN" ||
                              user?.id === (product as any).merchantId ||
                              user?.id === (product as any).agentId) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full transition-all"
                                onClick={() => handleDeleteReview(rev.id)}
                                title="حذف هذا التقييم"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-[#5D5D5D] leading-relaxed pr-2 border-r-2 border-[#C9A962]/20">
                          "{rev.comment}"
                        </p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-16 bg-white/50 rounded-3xl border-2 border-dashed border-[#E8E0D8] space-y-3">
                      <div className="bg-[#FAF7F2] w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <MessageCircle className="h-8 w-8 text-gray-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#3D3021] font-medium">
                          لا توجد تقييمات حتى الآن
                        </p>
                        <p className="text-xs text-gray-400">
                          كن أول من يشاركنا تجربته ويساعد الآخرين
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* نموذج إضافة تقييم جديد: يظهر للكل ولكن الزر يتحكم في الصلاحية */}
                <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6] p-8 rounded-[2.5rem] border border-[#E8E0D8] shadow-sm space-y-6 relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <div className="space-y-2 text-center md:text-right">
                      <h3 className="font-bold text-xl text-[#3D3021]">
                        اترك بصمتك ✨
                      </h3>
                      <p className="text-xs text-[#8B7355]">
                        رأيك يهمنا ويساعدنا على تقديم الأفضل دائماً
                      </p>
                    </div>

                    <div className="flex flex-col items-center md:items-start gap-4">
                      <p className="text-sm font-medium text-[#3D3021]">
                        كيف تقيم تجربتك؟
                      </p>
                      <div className="flex gap-3 bg-white p-3 rounded-2xl shadow-sm border border-[#E8E0D8]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setUserRating(star)}
                            className="focus:outline-none transition-all hover:scale-125 active:scale-95"
                          >
                            <Star
                              className={`h-8 w-8 transition-colors ${
                                userRating >= star
                                  ? "fill-yellow-400 text-yellow-400 shadow-yellow-200"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <p className="text-sm font-medium text-[#3D3021]">
                          تعليقك الصادق:
                        </p>
                        <span className="text-[10px] text-gray-400">
                          اختياري
                        </span>
                      </div>
                      <textarea
                        placeholder="اكتب تجربتك هنا.. هل أعجبك المنتج؟ كيف كانت سرعة التوصيل؟"
                        className="w-full p-5 rounded-2xl border border-[#E8E0D8] focus:ring-2 focus:ring-[#C9A962] focus:border-transparent outline-none text-sm min-h-[140px] bg-white shadow-sm transition-all resize-none"
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                      />
                    </div>

                    <div className="space-y-4">
                      <Button
                        onClick={handleSubmitReview}
                        disabled={
                          isSubmittingReview || !!(user && !userComment.trim())
                        }
                        className={`w-full text-white rounded-full py-8 text-lg font-bold shadow-xl transition-all active:scale-95 ${
                          user
                            ? "bg-[#3D3021] hover:bg-[#2A2116] shadow-[#3D3021]/20"
                            : "bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] shadow-[#C9A962]/30"
                        }`}
                      >
                        {isSubmittingReview ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>جاري الإرسال...</span>
                          </div>
                        ) : user ? (
                          "إرسال تقييمي الآن"
                        ) : (
                          <div className="flex items-center gap-2">
                            <LogIn className="h-5 w-5" />
                            <span>سجل دخولك لتتمكن من التقييم</span>
                          </div>
                        )}
                      </Button>

                      {/* رسالة توضيحية لغير المسجلين */}
                      {!user && (
                        <div className="flex items-center gap-2 justify-center bg-rose-50 p-3 rounded-xl border border-rose-100">
                          <ShieldAlert className="h-4 w-4 text-rose-500" />
                          <p className="text-[11px] text-rose-600 font-medium italic">
                            عزيزي الزائر، التقييم متاح فقط للعملاء المسجلين
                            لضمان جودة ومصداقية التعليقات.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* لمسة جمالية: شعار خلفي باهت */}
                  <div className="absolute -bottom-10 -left-10 opacity-[0.03] rotate-12 pointer-events-none">
                    <Star className="h-64 w-64 fill-[#3D3021]" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold mb-6 text-[#3D3021]">
                منتجات مشابهة
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((item) => (
                  <Link key={item.id} href={`/products/${item.id}`}>
                    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all cursor-pointer bg-white rounded-2xl">
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={item.mainImage}
                          alt={item.nameAr}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                        />
                        {item.isFeatured && (
                          <Badge className="absolute top-2 right-2 bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white">
                            مميز
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-[#8B7355]">
                          {item.category?.nameAr}
                        </p>
                        <h3 className="font-semibold text-sm text-[#3D3021] line-clamp-1">
                          {item.nameAr}
                        </h3>
                        <p className="font-bold text-[#8B7355]">
                          {formatPrice(item.price)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <ChatWidget
        userId={user?.id || ""}
        userName={user?.name || "عميل ترفة"}
        userRole={user?.role || "GUEST"}
        productId={product.id} // يمرر معرف المنتج للمحادثة
        targetAgentId={product.agentId || product.merchantId || undefined}
      />

      <Footer />
    </div>
  );
}
