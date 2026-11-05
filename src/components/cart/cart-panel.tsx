/**
 * Shopping Cart Slide-out Panel (Phase 1: Cart Review)
 * Luxury Design for Tarifa Store - Mobile Optimized
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  Tag,
  Truck,
  Shield,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  LogIn, // ✅ تمت إعادة الاستيراد
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { id: string; name: string; email: string; phone: string } | null;
  onCheckout: () => void; // هذه الدالة ستفتح نافذة الدفع (المرحلة الثانية)
}

export function CartPanel({
  isOpen,
  onClose,
  user,
  onCheckout,
}: CartPanelProps) {
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleApplyPromo = () => {
    setPromoError("");
    if (!promoCode.trim()) return;
    if (promoCode.toLowerCase() === "tarifa10") {
      setPromoApplied(true);
    } else {
      setPromoError("الكود غير صالح");
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md lg:max-w-xl flex flex-col p-0 bg-gradient-to-b from-[#FAF7F2] to-white border-l-0 shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E8E0D8] bg-white/80 backdrop-blur-sm shrink-0">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C9A962] to-[#B8956E] rounded-full blur-md opacity-70" />
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center shadow-lg">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-[#3D3021]">
                    سلة التسوق
                  </span>
                  {state.cart.itemCount > 0 && (
                    <span className="text-xs text-[#8B7355]">
                      {state.cart.itemCount}{" "}
                      {state.cart.itemCount === 1 ? "منتج" : "منتجات"}
                    </span>
                  )}
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white border-0 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm">
                {state.cart.itemCount}
              </Badge>
            </SheetTitle>
          </SheetHeader>
        </div>

        {state.cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#C9A962]/20 to-[#B8956E]/20 rounded-full blur-2xl" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6] flex items-center justify-center border border-[#E8E0D8] shadow-inner">
                <Package className="h-16 w-16 text-[#C9A962]" />
              </div>
            </motion.div>
            <h3 className="text-2xl font-bold text-[#3D3021] mb-3">
              سلتك فارغة
            </h3>
            <p className="text-[#8B7355] mb-8 leading-relaxed px-4">
              لم تقم بإضافة أي منتجات بعد. استكشف مجموعتنا الفاخرة واملأ سلتك
              بأجمل القطع.
            </p>
            <Button
              onClick={onClose}
              size="lg"
              className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full px-10 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="h-5 w-5 ml-2" />
              تصفح المنتجات
              <ArrowLeft className="h-5 w-5 mr-2" />
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-5 px-4 space-y-5 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {state.cart.items.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-2xl shadow-sm border border-[#E8E0D8] hover:shadow-lg hover:border-[#C9A962]/30 transition-all duration-300"
                  >
                    {/* Product Image */}
                    <div className="relative w-full sm:w-28 h-40 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-[#FAF7F2] shadow-inner">
                      <img
                        src={item.image}
                        alt={item.nameAr}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {item.originalPrice &&
                        item.originalPrice > item.price && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold px-3 py-1 shadow-md">
                              خصم{" "}
                              {Math.round(
                                ((item.originalPrice - item.price) /
                                  item.originalPrice) *
                                  100,
                              )}
                              %
                            </Badge>
                          </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <h4 className="font-bold text-[#3D3021] text-lg leading-tight line-clamp-2">
                          {item.nameAr}
                        </h4>
                        {item.color && (
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: item.color }}
                            />
                            <p className="text-sm text-[#8B7355]">
                              اللون: {item.color}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-[#A69B8D] mt-1 line-clamp-1">
                          {item.name}
                        </p>
                      </div>

                      {/* Prices */}
                      <div className="flex items-baseline gap-3">
                        <span className="font-bold text-xl text-[#8B7355]">
                          {item.price.toLocaleString()} ر.ي
                        </span>
                        {item.originalPrice &&
                          item.originalPrice > item.price && (
                            <span className="text-base text-[#A69B8D] line-through">
                              {item.originalPrice.toLocaleString()} ر.ي
                            </span>
                          )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-[#FAF7F2] rounded-full p-1.5 border border-[#E8E0D8]">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-10 w-10 p-0 rounded-full hover:bg-white hover:shadow-sm transition-all"
                            onClick={() =>
                              handleQuantityChange(
                                item.productId,
                                item.quantity - 1,
                              )
                            }
                          >
                            <Minus className="h-5 w-5" />
                          </Button>
                          <span className="w-12 text-center font-bold text-[#3D3021] text-lg">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-10 w-10 p-0 rounded-full hover:bg-white hover:shadow-sm transition-all"
                            onClick={() =>
                              handleQuantityChange(
                                item.productId,
                                item.quantity + 1,
                              )
                            }
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          className="h-12 w-12 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      {item.quantity >= item.stock && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          الحد الأقصى للمخزون
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer with Promo & Summary */}
            <div className="shrink-0 border-t border-[#E8E0D8] bg-white/90 backdrop-blur-sm">
              {/* Promo Code */}
              <div className="px-5 py-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="أدخل كود الخصم"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoError("");
                      }}
                      disabled={promoApplied}
                      className={`border-[#E8E0D8] focus:border-[#C9A962] rounded-xl h-12 text-base pr-10 ${
                        promoApplied ? "bg-green-50 border-green-300" : ""
                      }`}
                    />
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#C9A962]" />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={promoApplied || !promoCode.trim()}
                    className="border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2] rounded-xl h-12 px-6 text-base font-medium"
                  >
                    تطبيق
                  </Button>
                </div>
                {promoError && (
                  <p className="text-sm text-rose-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {promoError}
                  </p>
                )}
                {promoApplied && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-emerald-600 mt-2 flex items-center gap-2 bg-emerald-50 p-2 rounded-lg"
                  >
                    <Sparkles className="h-4 w-4" />
                    تم تطبيق خصم 10% بنجاح!
                  </motion.p>
                )}
              </div>

              {/* Order Summary */}
              <div className="px-5 pb-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5D5D5D]">المجموع الفرعي</span>
                    <span className="font-medium text-[#3D3021]">
                      {state.cart.total.toLocaleString()} ر.ي
                    </span>
                  </div>

                  {/* Savings (Original Price Difference) */}
                  {state.cart.discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        لقد وفرت
                      </span>
                      <span className="font-medium">
                        {state.cart.discount.toLocaleString()} ر.ي
                      </span>
                    </div>
                  )}

                  {/* Promo Code Discount */}
                  {promoApplied && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        خصم الكود (10%)
                      </span>
                      <span className="font-medium">
                        -{(state.cart.total * 0.1).toLocaleString()} ر.ي
                      </span>
                    </div>
                  )}

                  <Separator className="bg-[#E8E0D8]" />

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-[#3D3021]">
                      الإجمالي النهائي
                    </span>
                    <span className="text-xl font-bold text-[#8B7355]">
                      {(promoApplied
                        ? state.cart.total * 0.9
                        : state.cart.total
                      ).toLocaleString()}{" "}
                      ر.ي
                    </span>
                  </div>
                  <p className="text-xs text-[#A69B8D] -mt-2">
                    شامل ضريبة القيمة المضافة
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="flex items-center gap-1.5 text-[#8B7355]">
                    <Truck className="h-5 w-5 text-[#C9A962]" />
                    <span className="text-sm">توصيل سريع</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8B7355]">
                    <Shield className="h-5 w-5 text-[#C9A962]" />
                    <span className="text-sm">دفع آمن</span>
                  </div>
                </div>

                {/* الزائر يمكنه إتمام الشراء مؤقتاً دون تسجيل دخول */}
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white py-7 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                  onClick={onCheckout}
                >
                  {!user && !isGuestCheckoutEnabled() ? (
                    <>
                      <LogIn className="h-5 w-5 ml-2" />
                      سجل الدخول للمتابعة
                    </>
                  ) : (
                    <>
                      متابعة للدفع
                      <ArrowLeft className="h-5 w-5 mr-2" />
                    </>
                  )}
                </Button>

                {/* Clear Cart Button */}
                <Button
                  variant="ghost"
                  className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-12"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  إفراغ السلة
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
