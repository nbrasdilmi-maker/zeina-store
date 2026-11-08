"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { AuthModals } from "@/components/auth/auth-modals";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { useWishlist } from "@/contexts/wishlist-context";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
  parentId?: string | null;
  productCount?: number;
  _count?: { products: number };
  children?: Category[];
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  categoryId?: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

// WhatsApp number
const WHATSAPP_NUMBER = "967780655615";

function buildTree(flatCategories: Category[]): Category[] {
  if (flatCategories.some((category) => category.children)) {
    return flatCategories.filter((category) => !category.parentId);
  }
  return flatCategories
    .filter((category) => !category.parentId)
    .map((category) => ({
      ...category,
      children: flatCategories.filter(
        (child) => child.parentId === category.id,
      ),
    }));
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "store">("store");

  const { state: cartState, clearCart } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products"),
        ]);

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(
            data.tree?.length
              ? data.tree
              : buildTree(data.categories || []),
          );
        }

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setViewMode("dashboard");
    window.location.reload();
  };

  const openWhatsApp = (message?: string) => {
    const url = message
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, "_blank");
  };

  const activeParent = selectedCategory
    ? categories.find(
        (category) =>
          category.slug === selectedCategory ||
          category.children?.some(
            (child) => child.slug === selectedCategory,
          ),
      )
    : null;

  const activeChild = activeParent?.children?.find(
    (child) => child.slug === selectedCategory,
  );

  const selectedIds = activeParent
    ? activeChild
      ? [activeChild.id]
      : [activeParent.id, ...(activeParent.children || []).map((child) => child.id)]
    : [];

  const filteredProducts = selectedCategory
    ? products.filter(
        (product) =>
          product.categoryId && selectedIds.includes(product.categoryId),
      )
    : products;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
      {/* Navbar */}
      <Navbar
        user={user}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onViewDashboard={() => setViewMode("dashboard")}
        onViewStore={() => setViewMode("store")}
        viewMode={viewMode}
      />

      {/* Auth Modals */}
      <AuthModals
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultTab="login"
      />

      {/* Cart Panel */}
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

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.cart.items}
        userId={user?.id || ""}
        onSuccess={() => clearCart()}
      />

      {/* Main Content */}
      <main className="flex-1 pt-24 md:pt-28 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
              <Sparkles className="h-4 w-4 inline ml-2" />
              استكشف
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
              التصنيفات
            </h1>
            <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
              تصفح الأقسام الرئيسية ثم اختر الفئة الفرعية التي تناسبك
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-12 w-12 text-[#C9A962]" />
              </motion.div>
              <p className="text-[#8B7355] mt-4">جاري التحميل...</p>
            </div>
          ) : selectedCategory && activeParent ? (
            /* Products inside the selected section / subcategory */
            <div>
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="mb-2 flex items-center gap-1 text-sm text-[#8B7355] hover:text-[#C9A962]"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                    كل الأقسام
                  </button>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#3D3021]">
                    {activeChild?.nameAr || activeParent.nameAr}
                  </h2>
                  <p className="text-[#8B7355] mt-1">
                    {filteredProducts.length} منتج
                    {activeChild ? ` في ${activeParent.nameAr}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCategory(null)}
                  className="text-[#8B7355] hover:bg-[#FAF7F2]"
                >
                  عرض كل الأقسام
                </Button>
              </div>

              {/* Subcategory chips */}
              <div className="mb-8 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(activeParent.slug)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    !activeChild
                      ? "bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white"
                      : "border border-[#E8E0D8] bg-white text-[#8B7355] hover:border-[#C9A962]"
                  }`}
                >
                  كل {activeParent.nameAr}
                </button>
                {activeParent.children?.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedCategory(child.slug)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      activeChild?.id === child.id
                        ? "bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white"
                        : "border border-[#E8E0D8] bg-white text-[#8B7355] hover:border-[#C9A962]"
                    }`}
                  >
                    {child.nameAr}
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl">
                  <Sparkles className="h-12 w-12 text-[#C9A962] mx-auto mb-4" />
                  <p className="text-[#8B7355]">لا توجد منتجات في هذه الفئة بعد</p>
                  <p className="text-sm text-[#A69B8D] mt-2">
                    جرّب فئة أخرى أو تصفح جميع المنتجات
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -10 }}
                      className="cursor-pointer group"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white rounded-2xl">
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={product.mainImage}
                            alt={product.nameAr}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          {product.originalPrice &&
                            product.originalPrice > product.price && (
                              <Badge className="absolute top-3 right-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1 rounded-full">
                                -
                                {Math.round(
                                  (1 - product.price / product.originalPrice) *
                                    100,
                                )}
                                %
                              </Badge>
                            )}
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(
                                    `استفسار عن منتج: ${product.nameAr}`,
                                  );
                                }}
                              >
                                <MessageCircle className="h-4 w-4 ml-1" />
                                استفسار
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="bg-white/90 hover:bg-white rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWishlist({
                                    productId: product.id,
                                    name: product.name,
                                    nameAr: product.nameAr,
                                    price: product.price,
                                    originalPrice: product.originalPrice,
                                    image: product.mainImage,
                                  });
                                }}
                              >
                                <Heart
                                  className={`h-4 w-4 ${
                                    isInWishlist(product.id)
                                      ? "fill-rose-500 text-rose-500"
                                      : ""
                                  }`}
                                />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-[#3D3021] text-base mb-3 line-clamp-2 min-h-[48px]">
                            {product.nameAr}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-[#8B7355]">
                              {product.price.toLocaleString()} ر.ي
                            </span>
                            {product.originalPrice &&
                              product.originalPrice > product.price && (
                                <span className="text-sm text-[#A69B8D] line-through">
                                  {product.originalPrice.toLocaleString()}
                                </span>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Section cards with their subcategories */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((category, index) => {
                const productCount =
                  category.productCount ?? category._count?.products ?? 0;

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Card className="group h-full overflow-hidden rounded-2xl border border-[#EDE5DA] bg-white shadow-sm transition-all duration-300 hover:border-[#C9A962]/50 hover:shadow-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(category.slug)}
                        className="flex w-full items-center gap-3 p-3.5 text-right md:gap-4 md:p-4"
                      >
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#FAF7F2] ring-1 ring-[#C9A962]/25 md:h-16 md:w-16">
                          <img
                            src={
                              category.image ||
                              "https://images.unsplash.com/photo-1541643600914-78b084683601?w=200"
                            }
                            alt={category.nameAr}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <span className="absolute inset-0 bg-gradient-to-t from-[#3D3021]/25 to-transparent" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-bold text-[#3D3021] md:text-lg">
                            {category.nameAr}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#A69B8D]">
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-[#C9A962]" />
                              {productCount} منتج
                            </span>
                            <span className="h-1 w-1 rounded-full bg-[#D8CFC3]" />
                            <span>
                              {category.children?.length || 0} فئة فرعية
                            </span>
                          </span>
                        </span>

                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF7F2] text-[#C9A962] transition-colors group-hover:bg-[#C9A962] group-hover:text-white">
                          <ChevronLeft className="h-4 w-4" />
                        </span>
                      </button>

                      <CardContent className="border-t border-[#F4EEE5] px-3.5 pb-3.5 pt-3 md:px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(category.children || []).map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setSelectedCategory(child.slug)}
                              className="rounded-full border border-[#EDE5DA] bg-[#FAF7F2] px-2.5 py-1 text-[11px] font-semibold text-[#8B7355] transition-colors hover:border-[#C9A962] hover:bg-white hover:text-[#3D3021]"
                            >
                              {child.nameAr}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
