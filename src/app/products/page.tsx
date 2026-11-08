"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Check,
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { AuthModals } from "@/components/auth/auth-modals";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AgentDashboard } from "@/components/agent/agent-dashboard";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/contexts/cart-context";
import { isGuestCheckoutEnabled } from "@/lib/demo-client";
import { useWishlist } from "@/contexts/wishlist-context";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
  descriptionAr?: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  inStock?: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: {
    id: string;
    nameAr: string;
    slug: string;
    parentId?: string | null;
  };
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  parentId?: string | null;
  productCount?: number;
  children?: Category[];
}

interface FilterPanelProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  categories: Category[];
  expandedCategory: string | null;
  setExpandedCategory: (slug: string | null) => void;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  onClear: () => void;
  activeFilterCount: number;
  getCategoryCount: (category: Category) => number;
}

// WhatsApp number
const WHATSAPP_NUMBER = "967780655615";

function FilterPanel({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  onSelectCategory,
  categories,
  expandedCategory,
  setExpandedCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  inStockOnly,
  setInStockOnly,
  onClear,
  activeFilterCount,
  getCategoryCount,
}: FilterPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#3D3021]">تصفية النتائج</h3>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-[#C9A962] hover:text-[#8B7355]"
          >
            مسح الكل ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#3D3021]">
          البحث
        </label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C9A962]" />
          <Input
            placeholder="ابحث عن منتج..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-11 rounded-xl border-[#E8E0D8] bg-[#FAF7F2] pr-10 text-sm focus:border-[#C9A962]"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#3D3021]">
          الأقسام
        </label>
        <div className="max-h-[340px] space-y-1 overflow-y-auto pl-1">
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              selectedCategory === "all"
                ? "bg-[#C9A962]/15 font-bold text-[#8B7355]"
                : "text-[#3D3021] hover:bg-[#FAF7F2]"
            }`}
          >
            <span>كل الأقسام</span>
            <span className="text-xs text-[#A69B8D]">
              {categories.reduce(
                (total, category) => total + getCategoryCount(category),
                0,
              )}
            </span>
          </button>

          {categories.map((category) => {
            const isExpanded = expandedCategory === category.slug;
            const isActive =
              selectedCategory === category.slug ||
              category.children?.some(
                (child) => child.slug === selectedCategory,
              );

            return (
              <div key={category.id}>
                <div
                  className={`flex items-center rounded-lg transition-colors ${
                    isActive ? "bg-[#C9A962]/10" : "hover:bg-[#FAF7F2]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCategory(category.slug)}
                    className={`flex flex-1 items-center justify-between py-2 pr-3 text-right text-sm ${
                      isActive
                        ? "font-bold text-[#8B7355]"
                        : "text-[#3D3021]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isActive && (
                        <Check className="h-3.5 w-3.5 text-[#C9A962]" />
                      )}
                      {category.nameAr}
                    </span>
                    <span className="text-xs text-[#A69B8D]">
                      {getCategoryCount(category)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : category.slug)
                    }
                    className="px-2 py-2 text-[#C9A962]"
                    aria-label={`إظهار فئات ${category.nameAr}`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-1 space-y-0.5 border-r-2 border-[#E8E0D8] pr-3">
                    {category.children?.map((child) => {
                      const isChildActive = selectedCategory === child.slug;
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => onSelectCategory(child.slug)}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-right text-sm transition-colors ${
                            isChildActive
                              ? "font-bold text-[#C9A962]"
                              : "text-[#8B7355] hover:bg-[#FAF7F2] hover:text-[#3D3021]"
                          }`}
                        >
                          <span>{child.nameAr}</span>
                          <span className="text-xs text-[#A69B8D]">
                            {getCategoryCount(child)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#3D3021]">
          السعر (ر.ي)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="من"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            className="h-11 rounded-xl border-[#E8E0D8] bg-[#FAF7F2] text-sm"
          />
          <span className="text-[#A69B8D]">—</span>
          <Input
            type="number"
            min={0}
            placeholder="إلى"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            className="h-11 rounded-xl border-[#E8E0D8] bg-[#FAF7F2] text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMinPrice("");
              setMaxPrice("20000");
            }}
            className="rounded-full border border-[#E8E0D8] px-3 py-1 text-xs text-[#8B7355] hover:border-[#C9A962]"
          >
            أقل من 20,000
          </button>
          <button
            type="button"
            onClick={() => {
              setMinPrice("20000");
              setMaxPrice("50000");
            }}
            className="rounded-full border border-[#E8E0D8] px-3 py-1 text-xs text-[#8B7355] hover:border-[#C9A962]"
          >
            20,000 - 50,000
          </button>
          <button
            type="button"
            onClick={() => {
              setMinPrice("50000");
              setMaxPrice("");
            }}
            className="rounded-full border border-[#E8E0D8] px-3 py-1 text-xs text-[#8B7355] hover:border-[#C9A962]"
          >
            فوق 50,000
          </button>
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#3D3021]">
          التوفر
        </label>
        <button
          type="button"
          onClick={() => setInStockOnly(!inStockOnly)}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
            inStockOnly
              ? "border-[#C9A962] bg-[#C9A962]/10 font-semibold text-[#8B7355]"
              : "border-[#E8E0D8] text-[#3D3021] hover:border-[#C9A962]"
          }`}
        >
          <span>المتوفر فقط</span>
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border ${
              inStockOnly
                ? "border-[#C9A962] bg-[#C9A962] text-white"
                : "border-[#D8CFC3] bg-white"
            }`}
          >
            {inStockOnly && <Check className="h-3.5 w-3.5" />}
          </span>
        </button>
      </div>

      <Button
        variant="outline"
        onClick={onClear}
        className="w-full rounded-xl border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"
      >
        إعادة ضبط الفلاتر
      </Button>
    </div>
  );
}

export default function ProductsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    const categoryParam = new URLSearchParams(window.location.search).get(
      "category",
    );
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          const flat: Category[] = data.categories || [];
          const tree: Category[] = data.tree?.length
            ? data.tree
            : flat
                .filter((category) => !category.parentId)
                .map((category) => ({
                  ...category,
                  children: flat.filter(
                    (child) => child.parentId === category.id,
                  ),
                }));
          setCategories(tree);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Home page links may pass a category id instead of its slug.
  useEffect(() => {
    if (
      categories.length === 0 ||
      selectedCategory === "all" ||
      !selectedCategory
    ) {
      return;
    }
    const allCategories = categories.flatMap((category) => [
      category,
      ...(category.children || []),
    ]);
    const match = allCategories.find(
      (category) => category.id === selectedCategory,
    );
    if (match && match.slug !== selectedCategory) {
      setSelectedCategory(match.slug);
    }
  }, [categories, selectedCategory]);

  // Keep the active section expanded in the filter sidebar.
  useEffect(() => {
    if (selectedCategory === "all") return;
    const parent = categories.find(
      (category) =>
        category.slug === selectedCategory ||
        category.children?.some((child) => child.slug === selectedCategory),
    );
    if (parent) setExpandedCategory(parent.slug);
  }, [categories, selectedCategory]);

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

  const getCategoryCount = (category: Category) => {
    const ids = [
      category.id,
      ...(category.children || []).map((child) => child.id),
    ];
    return products.filter(
      (product) => product.categoryId && ids.includes(product.categoryId),
    ).length;
  };

  const activeParent = categories.find(
    (category) =>
      category.slug === selectedCategory ||
      category.children?.some((child) => child.slug === selectedCategory),
  );
  const activeChild = activeParent?.children?.find(
    (child) => child.slug === selectedCategory,
  );
  const selectedIds = activeParent
    ? activeChild
      ? [activeChild.id]
      : [
          activeParent.id,
          ...(activeParent.children || []).map((child) => child.id),
        ]
    : [];

  const min = Number(minPrice);
  const max = Number(maxPrice);
  const hasMin = minPrice.trim() !== "" && Number.isFinite(min);
  const hasMax = maxPrice.trim() !== "" && Number.isFinite(max) && max > 0;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  let filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (product.categoryId && selectedIds.includes(product.categoryId));
    const matchesSearch =
      normalizedSearch === "" ||
      product.nameAr.toLowerCase().includes(normalizedSearch) ||
      product.name.toLowerCase().includes(normalizedSearch) ||
      (product.sku || "").toLowerCase().includes(normalizedSearch) ||
      (product.descriptionAr || "").toLowerCase().includes(normalizedSearch);
    const matchesMin = !hasMin || product.price >= min;
    const matchesMax = !hasMax || product.price <= max;
    const matchesStock =
      !inStockOnly ||
      (product.inStock !== false && product.stock > 0);
    return (
      matchesCategory &&
      matchesSearch &&
      matchesMin &&
      matchesMax &&
      matchesStock
    );
  });

  if (sortBy === "price-low") {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-high") {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  } else if (sortBy === "name") {
    filteredProducts = [...filteredProducts].sort((a, b) =>
      a.nameAr.localeCompare(b.nameAr, "ar"),
    );
  }

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (searchQuery.trim() !== "" ? 1 : 0) +
    (hasMin || hasMax ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setSortBy("newest");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const selectCategory = (slug: string) => {
    setSelectedCategory(slug);
    if (slug !== "all") {
      const parent = categories.find(
        (category) =>
          category.slug === slug ||
          category.children?.some((child) => child.slug === slug),
      );
      if (parent) setExpandedCategory(parent.slug);
    }
    window.history.replaceState(
      null,
      "",
      slug === "all"
        ? window.location.pathname
        : `${window.location.pathname}?category=${slug}`,
    );
  };

  const filterPanelProps: FilterPanelProps = {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    onSelectCategory: selectCategory,
    categories,
    expandedCategory,
    setExpandedCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    inStockOnly,
    setInStockOnly,
    onClear: clearFilters,
    activeFilterCount,
    getCategoryCount,
  };

  // Show dashboards for logged users
  if (user && viewMode === "dashboard") {
    if (user.role === "ADMIN") {
      return (
        <AdminDashboard
          user={user}
          onLogout={handleLogout}
          onViewStore={() => setViewMode("store")}
        />
      );
    }
    if (user.role === "AGENT") {
      return (
        <AgentDashboard
          user={user}
          onLogout={handleLogout}
          onViewStore={() => setViewMode("store")}
        />
      );
    }
    if (user.role === "CUSTOMER") {
      return (
        <>
          <CustomerDashboard
            user={user}
            onLogout={handleLogout}
            onViewStore={() => setViewMode("store")}
          />
          <ChatWidget
            userId={user.id}
            userName={user.name}
            userRole={user.role}
          />
        </>
      );
    }
  }

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
        onSuccess={() => {
          clearCart();
        }}
      />

      {/* Main Content */}
      <main className="flex-1 pt-24 md:pt-28 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">
              <Sparkles className="h-4 w-4 inline ml-2" />
              تسوق الآن
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
              جميع المنتجات
            </h1>
            <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
              ابحث وفلتر بين جميع الأقسام والفئات الفرعية
            </p>
          </motion.div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#8B7355]">الفلاتر النشطة:</span>
              {selectedCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => selectCategory("all")}
                  className="flex items-center gap-1 rounded-full bg-[#C9A962]/15 px-3 py-1 text-xs font-semibold text-[#8B7355]"
                >
                  {activeChild?.nameAr || activeParent?.nameAr || "قسم"}
                  <X className="h-3 w-3" />
                </button>
              )}
              {searchQuery.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex items-center gap-1 rounded-full bg-[#C9A962]/15 px-3 py-1 text-xs font-semibold text-[#8B7355]"
                >
                  «{searchQuery.trim()}»
                  <X className="h-3 w-3" />
                </button>
              )}
              {(hasMin || hasMax) && (
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                  }}
                  className="flex items-center gap-1 rounded-full bg-[#C9A962]/15 px-3 py-1 text-xs font-semibold text-[#8B7355]"
                >
                  السعر: {hasMin ? min.toLocaleString() : "0"} -{" "}
                  {hasMax ? max.toLocaleString() : "بلا حد"}
                  <X className="h-3 w-3" />
                </button>
              )}
              {inStockOnly && (
                <button
                  type="button"
                  onClick={() => setInStockOnly(false)}
                  className="flex items-center gap-1 rounded-full bg-[#C9A962]/15 px-3 py-1 text-xs font-semibold text-[#8B7355]"
                >
                  المتوفر فقط
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
            {/* Sidebar - desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 rounded-2xl border border-[#E8E0D8] bg-white p-5 shadow-lg">
                <FilterPanel {...filterPanelProps} />
              </div>
            </aside>

            <div>
              {/* Toolbar */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8E0D8] bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsFiltersOpen(true)}
                    className="gap-2 rounded-xl border-[#C9A962] text-[#8B7355] lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    الفلاتر
                    {activeFilterCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A962] text-xs text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  <p className="text-sm text-[#8B7355]">
                    عرض{" "}
                    <span className="font-bold text-[#3D3021]">
                      {filteredProducts.length}
                    </span>{" "}
                    منتج
                  </p>
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-11 w-[190px] rounded-xl border-[#E8E0D8] bg-[#FAF7F2]">
                    <SelectValue placeholder="الترتيب" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="price-low">السعر: من الأقل</SelectItem>
                    <SelectItem value="price-high">السعر: من الأعلى</SelectItem>
                    <SelectItem value="name">الاسم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Products Grid */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Sparkles className="h-12 w-12 text-[#C9A962]" />
                  </motion.div>
                  <p className="text-[#8B7355] mt-4">جاري التحميل...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-6">
                    <Search className="h-12 w-12 text-[#C9A962]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#3D3021] mb-2">
                    لا توجد منتجات
                  </h3>
                  <p className="text-[#8B7355] mb-6">
                    جرّب تغيير الفلاتر أو البحث بكلمات أخرى
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-full px-8"
                    onClick={clearFilters}
                  >
                    إعادة ضبط الفلاتر
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white rounded-2xl h-full">
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={product.mainImage}
                            alt={product.nameAr}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute top-3 right-3 flex flex-col gap-2">
                            {product.isFeatured && (
                              <Badge className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white border-0 px-3 py-1 rounded-full">
                                <Star className="h-3 w-3 ml-1" />
                                مميز
                              </Badge>
                            )}
                            {product.originalPrice &&
                              product.originalPrice > product.price && (
                                <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 px-3 py-1 rounded-full">
                                  -
                                  {Math.round(
                                    (1 - product.price / product.originalPrice) *
                                      100,
                                  )}
                                  %
                                </Badge>
                              )}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full"
                                onClick={(event) => {
                                  event.stopPropagation();
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
                                onClick={(event) => {
                                  event.stopPropagation();
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
                          <p className="text-xs text-[#C9A962] font-medium mb-2 uppercase tracking-wider">
                            {product.category?.nameAr || "بدون تصنيف"}
                          </p>
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
          </div>
        </div>
      </main>

      {/* Mobile filters */}
      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent
          side="right"
          className="w-[320px] overflow-y-auto bg-white p-5 sm:w-[360px]"
        >
          <SheetTitle className="sr-only">تصفية النتائج</SheetTitle>
          <FilterPanel {...filterPanelProps} />
        </SheetContent>
      </Sheet>

      {/* Footer */}
      <Footer />
    </div>
  );
}
