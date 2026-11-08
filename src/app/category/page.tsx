"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ChevronLeft, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  image?: string;
  parentId?: string | null;
  productCount?: number;
  _count?: { products: number };
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(
        data.tree?.length
          ? data.tree
          : (data.categories || []).filter(
              (category: Category) => !category.parentId,
            ),
      );
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <img src="/zeina-logo-header.png" alt="زينة" className="h-10 w-auto object-contain" />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="font-medium hover:text-[var(--gold)] transition-colors">
                الرئيسية
              </Link>
              <Link href="/products" className="font-medium hover:text-[var(--gold)] transition-colors">
                المنتجات
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm font-medium">{user.name}</span>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Link href="/">
                  <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                    تسجيل الدخول
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">تصفح الفئات</h1>
          <p className="text-[var(--muted-foreground)]">اكتشف مجموعتنا المتنوعة من المنتجات الفاخرة</p>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">لا توجد فئات حالياً</p>
            <Link href="/products">
              <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                تصفح جميع المنتجات
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/category/${category.id}`}>
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={category.image || `https://images.unsplash.com/photo-1541643600914-78b084683601?w=400`}
                        alt={category.nameAr}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                        <h3 className="text-white text-lg md:text-xl font-bold mb-1">
                          {category.nameAr}
                        </h3>
                        <p className="text-white/70 text-sm">
                          {category.productCount ??
                            category._count?.products ??
                            0}{" "}
                          منتج
                        </p>
                      </div>
                      <div className="absolute inset-0 border-4 border-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* All Products Link */}
        <div className="text-center mt-12">
          <Link href="/products">
            <Button
              size="lg"
              variant="outline"
              className="border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white px-8"
            >
              عرض جميع المنتجات
              <ChevronLeft className="mr-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <img src="/zeina-logo-footer.png" alt="زينة" className="h-12 w-auto mx-auto mb-4 object-contain" />
          <p className="text-gray-400">© {new Date().getFullYear()} زينة. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
