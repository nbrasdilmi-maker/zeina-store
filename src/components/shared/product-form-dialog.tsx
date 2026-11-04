"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  X,
  Image as ImageIcon,
  Plus,
  Save,
  RefreshCw,
  Tag,
  Palette,
  Package,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload";

// (الواجهات كما هي بدون تغيير)
interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  images?: string;
  stock: number;
  sku?: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: Category;
  colors?: string;
  sizes?: string;
  videoUrl?: string;
  featuresAr?: string;
  usageAr?: string;
  ingredientsAr?: string;
  inStock?: boolean;
  estimatedDays?: number;
}

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedProduct?: Product | null;
  userId: string;
  isSaving?: boolean;
  onSave: (data: any) => Promise<void>;
}

export function ProductFormDialog({
  isOpen,
  onClose,
  categories,
  selectedProduct,
  userId,
  isSaving = false,
  onSave,
}: ProductFormDialogProps) {
  // (كل الحالات كما هي)
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    originalPrice: "",
    mainImage: "",
    stock: "",
    categoryId: "",
    isFeatured: false,
    isActive: true,
    colors: "",
    images: "[]",
    inStock: true,
    estimatedDays: "",
    sizes: "",
    videoUrl: "",
    featuresAr: "",
    usageAr: "",
    ingredientsAr: "",
  });

  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [selectedColors, setSelectedColors] = useState<any[]>([]);
  const [availableColors, setAvailableColors] = useState([
    { name: "أحمر", hex: "#ef4444" },
    { name: "أزرق", hex: "#3b82f6" },
    { name: "أخضر", hex: "#22c55e" },
    { name: "أسود", hex: "#000000" },
    { name: "أبيض", hex: "#ffffff" },
    { name: "ذهبي", hex: "#eab308" },
    { name: "فضي", hex: "#94a3b8" },
    { name: "وردي", hex: "#ec4899" },
    { name: "بنفسجي", hex: "#a855f7" },
    { name: "بني", hex: "#8B4513" },
    { name: "رمادي", hex: "#6b7280" },
    { name: "برتقالي", hex: "#f97316" },
  ]);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState([
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "30ml",
    "50ml",
    "100ml",
  ]);
  const [newSizeInput, setNewSizeInput] = useState("");

  // (useEffect كما هو)
  useEffect(() => {
    if (isOpen) {
      if (selectedProduct) {
        setForm({
          name: selectedProduct.name,
          nameAr: selectedProduct.nameAr,
          description: selectedProduct.description || "",
          descriptionAr: selectedProduct.descriptionAr || "",
          price: selectedProduct.price.toString(),
          originalPrice: selectedProduct.originalPrice?.toString() || "",
          mainImage: selectedProduct.mainImage,
          stock: selectedProduct.stock.toString(),
          categoryId: selectedProduct.categoryId || "",
          isFeatured: selectedProduct.isFeatured,
          isActive: selectedProduct.isActive,
          colors: selectedProduct.colors || "",
          images: selectedProduct.images || "[]",
          inStock: selectedProduct.inStock ?? true,
          estimatedDays: selectedProduct.estimatedDays?.toString() || "",
          sizes: selectedProduct.sizes || "",
          videoUrl: selectedProduct.videoUrl || "",
          featuresAr: selectedProduct.featuresAr || "",
          usageAr: selectedProduct.usageAr || "",
          ingredientsAr: selectedProduct.ingredientsAr || "",
        });

        try {
          const parsedColors = selectedProduct.colors
            ? JSON.parse(selectedProduct.colors)
            : [];
          setSelectedColors(parsedColors);
        } catch {}

        try {
          const parsedImages = selectedProduct.images
            ? JSON.parse(selectedProduct.images)
            : [];
          if (parsedImages.length > 0) setImagePreview(parsedImages[0]);
        } catch {}

        try {
          const parsedSizes = selectedProduct.sizes
            ? JSON.parse(selectedProduct.sizes)
            : [];
          setSelectedSizes(parsedSizes);
        } catch {
          setSelectedSizes(
            selectedProduct.sizes ? [selectedProduct.sizes] : [],
          );
        }
      } else {
        setForm({
          name: "",
          nameAr: "",
          description: "",
          descriptionAr: "",
          price: "",
          originalPrice: "",
          mainImage: "",
          stock: "",
          categoryId: "",
          isFeatured: false,
          isActive: true,
          colors: "",
          images: "[]",
          inStock: true,
          estimatedDays: "",
          sizes: "",
          videoUrl: "",
          featuresAr: "",
          usageAr: "",
          ingredientsAr: "",
        });
        setImagePreview(null);
        setSelectedColors([]);
        setSelectedSizes([]);
        setNewColorName("");
        setNewSizeInput("");
      }
    }
  }, [isOpen, selectedProduct]);

  // (الدوال كما هي)
  const handleAddNewColor = () => {
    if (newColorName.trim()) {
      const newColor = { name: newColorName.trim(), hex: newColorHex };
      setAvailableColors([...availableColors, newColor]);
      const updatedColors = [...selectedColors, newColor];
      setSelectedColors(updatedColors);
      setForm({ ...form, colors: JSON.stringify(updatedColors) });
      setNewColorName("");
    }
  };

  const toggleSize = (size: string) => {
    let updated;
    if (selectedSizes.includes(size)) {
      updated = selectedSizes.filter((s) => s !== size);
    } else {
      updated = [...selectedSizes, size];
    }
    setSelectedSizes(updated);
    setForm({ ...form, sizes: JSON.stringify(updated) });
  };

  const handleAddNewSize = () => {
    if (newSizeInput.trim() && !availableSizes.includes(newSizeInput.trim())) {
      const size = newSizeInput.trim();
      setAvailableSizes([...availableSizes, size]);
      const updatedSizes = [...selectedSizes, size];
      setSelectedSizes(updatedSizes);
      setForm({ ...form, sizes: JSON.stringify(updatedSizes) });
      setNewSizeInput("");
    }
  };

  const handleMultipleImagesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!form.categoryId) {
      toast({
        title: "تنبيه",
        description: "يجب اختيار التصنيف أولاً لضمان تنظيم ملفاتك",
        variant: "destructive",
      });
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedCategory = categories.find((c) => c.id === form.categoryId);
    const folderPath = selectedCategory
      ? `/products/${selectedCategory.slug || selectedCategory.name}`
      : "/products/general";

    setIsUploadingImages(true);
    let currentImages: string[] = [];

    try {
      currentImages = form.images ? JSON.parse(form.images) : [];
    } catch {}

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "تنبيه",
          description: `الصورة ${file.name} أكبر من 5 ميجا`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const result = await uploadImage(file, folderPath);
        if (result.success && result.url) {
          currentImages.push(result.url);
        } else {
          toast({
            title: "خطأ",
            description: `فشل رفع ${file.name}`,
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "خطأ",
          description: `حدث خطأ أثناء رفع ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setForm({
      ...form,
      images: JSON.stringify(currentImages),
      mainImage: currentImages[0] || form.mainImage,
    });
    if (currentImages.length > 0) setImagePreview(currentImages[0]);

    setIsUploadingImages(false);
    e.target.value = "";
    toast({
      title: "تم التحديث",
      description: `تم تنظيم الصور في مجلد: ${folderPath}`,
    });
  };

  const removeImage = (indexToRemove: number) => {
    try {
      let currentImages: string[] = form.images ? JSON.parse(form.images) : [];
      currentImages = currentImages.filter(
        (_, index) => index !== indexToRemove,
      );
      setForm({ ...form, images: JSON.stringify(currentImages) });
      setImagePreview(currentImages[0] || null);
    } catch {}
  };
  const handleAIGenerate = async () => {
    if (!form.mainImage) {
      toast({
        title: "تنبيه",
        description: "يرجى رفع صورة رئيسية للمنتج أولاً",
        variant: "destructive",
      });
      return;
    }
    if (!form.categoryId) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار التصنيف أولاً لمساعدة الذكاء الاصطناعي",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const selectedCategory = categories.find((c) => c.id === form.categoryId);
      const token = localStorage.getItem("token"); // ✅ جلب التوكن

      let imageBase64 = form.mainImage;
      if (!imageBase64.startsWith("data:")) {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const res = await fetch("/api/ai/generate-product-details", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }), // ✅ هيدر التوكن
        },
        body: JSON.stringify({
          imageUrl: form.mainImage,
          categoryNameAr: selectedCategory?.nameAr || "",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "فشل التوليد");
      }

      const aiData = data.data;

      setForm((prev) => ({
        ...prev,
        nameAr: aiData.nameAr || prev.nameAr,
        name: aiData.nameEn || prev.name,
        descriptionAr: aiData.descriptionAr || prev.descriptionAr,
        description: aiData.descriptionEn || prev.description,
        featuresAr: aiData.featuresAr || prev.featuresAr,
        usageAr: aiData.usageAr || prev.usageAr,
        price: aiData.priceEstimate
          ? aiData.priceEstimate.toString()
          : prev.price,
      }));

      toast({
        title: "تم بنجاح",
        description:
          "تم ملء الحقول بالبيانات المقترحة. يمكنك التعديل قبل الحفظ.",
      });
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل الاتصال بالذكاء الاصطناعي",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };
  const handleSave = async () => {
    if (!form.name || !form.nameAr || !form.price || !form.mainImage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const bodyToSave = {
      ...form,
      price: parseFloat(form.price),
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
      stock: parseInt(form.stock) || 0,
      estimatedDays: form.estimatedDays ? parseInt(form.estimatedDays) : null,
      agentId: userId,
    };

    if (selectedProduct) {
      bodyToSave.id = selectedProduct.id;
    }

    await onSave(bodyToSave);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-3xl max-h-[95vh] overflow-y-auto p-0 rounded-xl shadow-2xl"
        dir="rtl"
      >
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#3D3021]">
            <Tag className="h-6 w-6 text-[#C9A962]" />
            {selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#8B7355]">
            {selectedProduct
              ? "قم بتعديل بيانات المنتج أدناه"
              : "أدخل بيانات المنتج الجديد لإضافته إلى المتجر"}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* ========== القسم الأساسي (ظاهر دائماً) ========== */}
          {/* 1. الصور */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <ImageIcon className="h-5 w-5 text-[#C9A962]" />
              <h3 className="font-bold text-[#3D3021]">صور المنتج</h3>
            </div>

            {imagePreview && (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-[#E8E0D8] shadow-inner">
                <img
                  src={imagePreview}
                  alt="معاينة"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="رابط الصورة الرئيسية"
                  value={form.mainImage}
                  onChange={(e) => {
                    setForm({ ...form, mainImage: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                  className="flex-1 bg-[#FAF7F2] border-[#E8E0D8] h-12 text-base"
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  id="multi-image-upload"
                  className="hidden"
                  onChange={handleMultipleImagesUpload}
                  disabled={isUploadingImages}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!form.categoryId) {
                      toast({
                        title: "تنبيه",
                        description:
                          "يرجى اختيار التصنيف أولاً لضمان تنظيم صورك في المجلد الصحيح",
                        variant: "destructive",
                      });
                      return;
                    }
                    document.getElementById("multi-image-upload")?.click();
                  }}
                  disabled={isUploadingImages || !form.categoryId}
                  className={`h-12 px-6 text-base font-medium border-2 border-[#C9A962] text-[#8B7355] hover:bg-[#C9A962] hover:text-white transition-all ${!form.categoryId ? "opacity-50" : ""}`}
                >
                  {isUploadingImages ? (
                    <RefreshCw className="h-5 w-5 animate-spin ml-2" />
                  ) : (
                    <Upload className="h-5 w-5 ml-2" />
                  )}
                  رفع صور
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAIGenerate}
                disabled={isGeneratingAI || !form.mainImage || !form.categoryId}
                className={`h-12 px-6 text-base font-medium border-2 border-[#C9A962] bg-gradient-to-r from-[#C9A962]/10 to-[#B8956E]/10 text-[#8B7355] hover:bg-[#C9A962] hover:text-white transition-all ${!form.mainImage || !form.categoryId ? "opacity-50" : ""}`}
              >
                {isGeneratingAI ? (
                  <RefreshCw className="h-5 w-5 animate-spin ml-2" />
                ) : (
                  <Sparkles className="h-5 w-5 ml-2" />
                )}
                إنشاء بالذكاء
              </Button>

              {!form.categoryId && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg flex items-center gap-2">
                  ⚠️ اختر التصنيف أولاً لتفعيل رفع الصور المنظم
                </p>
              )}

              {form.images && JSON.parse(form.images).length > 1 && (
                <div className="flex gap-2 flex-wrap p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E0D8]">
                  {JSON.parse(form.images).map((img: string, index: number) => (
                    <div
                      key={index}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-md group"
                    >
                      <img
                        src={img}
                        alt={`صورة ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 2. البيانات الأساسية */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Tag className="h-5 w-5 text-[#C9A962]" />
              <h3 className="font-bold text-[#3D3021]">البيانات الأساسية</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  اسم المنتج (عربي) *
                </Label>
                <Input
                  placeholder="مثال: عطر الليل الذهبي"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  className="h-12 text-base bg-[#FAF7F2] border-[#E8E0D8]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  اسم المنتج (إنجليزي) *
                </Label>
                <Input
                  placeholder="مثال: Golden Night Perfume"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-12 text-base bg-[#FAF7F2] border-[#E8E0D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  السعر (ر.ي) *
                </Label>
                <Input
                  type="number"
                  placeholder="299"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="h-12 text-base bg-[#FAF7F2] border-[#E8E0D8]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  السعر الأصلي (قبل الخصم)
                </Label>
                <Input
                  type="number"
                  placeholder="450"
                  value={form.originalPrice}
                  onChange={(e) =>
                    setForm({ ...form, originalPrice: e.target.value })
                  }
                  className="h-12 text-base bg-[#FAF7F2] border-[#E8E0D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  الوصف (عربي)
                </Label>
                <Textarea
                  placeholder="وصف المنتج..."
                  value={form.descriptionAr}
                  onChange={(e) =>
                    setForm({ ...form, descriptionAr: e.target.value })
                  }
                  rows={3}
                  className="bg-[#FAF7F2] border-[#E8E0D8] text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  الوصف (إنجليزي)
                </Label>
                <Textarea
                  placeholder="Product description..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="bg-[#FAF7F2] border-[#E8E0D8] text-base"
                />
              </div>
            </div>
          </section>

          {/* 3. التصنيف والمخزون */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Package className="h-5 w-5 text-[#C9A962]" />
              <h3 className="font-bold text-[#3D3021]">التصنيف والمخزون</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  التصنيف
                </Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) =>
                    setForm({ ...form, categoryId: value })
                  }
                >
                  <SelectTrigger className="h-12 bg-[#FAF7F2] border-[#E8E0D8]">
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#5D5D5D]">
                  الكمية المتوفرة
                </Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="h-12 text-base bg-[#FAF7F2] border-[#E8E0D8]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#5D5D5D]">
                حالة التوفر
              </Label>
              <Select
                value={form.inStock ? "available" : "preorder"}
                onValueChange={(value) => {
                  const isAvailable = value === "available";
                  setForm({
                    ...form,
                    inStock: isAvailable,
                    estimatedDays: isAvailable ? "" : "14",
                  });
                }}
              >
                <SelectTrigger
                  className={`h-12 ${form.inStock ? "border-green-300 bg-green-50/50" : "border-orange-300 bg-orange-50/50"}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">✅ متوفر في المخزن</SelectItem>
                  <SelectItem value="preorder">
                    📦 سيتم طلبه عند الطلب
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!form.inStock && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                <p className="text-sm font-medium text-orange-800">
                  ⏱️ بما أن المنتج سيتم طلبه، يرجى تحديد المدة المتوقعة للتوصيل
                  بالأيام:
                </p>
                <Input
                  type="number"
                  placeholder="مثال: 14"
                  value={form.estimatedDays}
                  onChange={(e) =>
                    setForm({ ...form, estimatedDays: e.target.value })
                  }
                  className="h-12 bg-white border-orange-200"
                />
                <p className="text-xs text-orange-600">
                  سيظهر للعميل: "التوصيل من أسبوع إلى 3 أسابيع"
                </p>
              </div>
            )}
          </section>

          {/* ========== أقسام قابلة للطي (Accordion) ========== */}
          <Accordion type="multiple" className="space-y-2">
            {/* قسم المواصفات (ألوان، مقاسات، فيديو) */}
            <AccordionItem
              value="specs"
              className="border rounded-xl overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-[#FAF7F2] bg-white">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-[#C9A962]" />
                  <span className="font-bold text-[#3D3021]">
                    المواصفات (ألوان - مقاسات - فيديو)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-6 bg-[#FAF7F2]/30">
                {/* الألوان */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#5D5D5D]">
                    الألوان المتوفرة
                  </Label>
                  <div className="flex flex-wrap gap-3 p-3 bg-white rounded-xl border border-[#E8E0D8]">
                    {availableColors.map((colorObj) => {
                      const isSelected = selectedColors.some((c) =>
                        typeof c === "string"
                          ? c === colorObj.name
                          : c.name === colorObj.name,
                      );
                      return (
                        <button
                          key={colorObj.name}
                          type="button"
                          onClick={() => {
                            let newColors;
                            if (isSelected) {
                              newColors = selectedColors.filter((c) =>
                                typeof c === "string"
                                  ? c !== colorObj.name
                                  : c.name !== colorObj.name,
                              );
                            } else {
                              newColors = [...selectedColors, colorObj];
                            }
                            setSelectedColors(newColors);
                            setForm({
                              ...form,
                              colors: JSON.stringify(newColors),
                            });
                          }}
                          className={`flex-shrink-0 flex flex-col items-center gap-1 transition-all ${isSelected ? "scale-105" : "opacity-70"}`}
                        >
                          <div
                            className={`w-12 h-12 rounded-full border-2 shadow-md ${isSelected ? "border-[#C9A962] ring-4 ring-[#C9A962]/30" : "border-gray-300"}`}
                            style={{ backgroundColor: colorObj.hex }}
                          >
                            {isSelected && (
                              <span
                                className={`text-lg font-bold flex items-center justify-center h-full ${["أبيض", "فضي", "ذهبي"].includes(colorObj.name) ? "text-black" : "text-white"}`}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs font-medium ${isSelected ? "text-[#C9A962]" : "text-gray-600"}`}
                          >
                            {colorObj.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-center bg-purple-50 p-3 rounded-xl border border-purple-100">
                    <Input
                      placeholder="اسم اللون (مثال: عنابي)"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      className="h-12 text-base flex-1 bg-white"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white shadow-md"
                      />
                      <Button
                        type="button"
                        onClick={handleAddNewColor}
                        size="sm"
                        className="h-12 px-4 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Plus className="h-4 w-4 ml-1" /> إضافة لون
                      </Button>
                    </div>
                  </div>
                </div>

                {/* المقاسات */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-[#5D5D5D]">
                    المقاسات / الأحجام
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-[#E8E0D8]">
                    {availableSizes.map((size) => {
                      const isSelected = selectedSizes.includes(size);
                      return (
                        <Badge
                          key={size}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer px-4 py-2 text-sm transition-all ${isSelected ? "bg-[#C9A962] hover:bg-[#B8956E] text-white scale-105" : "hover:bg-[#C9A962]/10 hover:text-[#8B7355]"}`}
                          onClick={() => toggleSize(size)}
                        >
                          {size}
                          {isSelected && (
                            <span className="mr-1 text-white text-xs">✓</span>
                          )}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="مقاس جديد (مثال: 3XL)"
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNewSize();
                      }}
                      className="h-12 text-base flex-1 bg-white border-[#E8E0D8]"
                    />
                    <Button
                      type="button"
                      onClick={handleAddNewSize}
                      className="h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 ml-1" /> إضافة مقاس
                    </Button>
                  </div>
                </div>

                {/* رابط الفيديو */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#5D5D5D] flex items-center gap-2">
                    <span className="text-pink-500">📷</span> رابط فيديو المنتج
                    (ريلز)
                  </Label>
                  <Input
                    placeholder="https://instagram.com/reel/..."
                    value={form.videoUrl}
                    onChange={(e) =>
                      setForm({ ...form, videoUrl: e.target.value })
                    }
                    className="h-12 text-base bg-white border-[#E8E0D8]"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* قسم المحتوى الفخم */}
            <AccordionItem
              value="details"
              className="border rounded-xl overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-[#FAF7F2] bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <span className="font-bold text-[#3D3021]">
                    المحتوى الفخم (تفاصيل إضافية)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-4 bg-[#FAF7F2]/30">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#5D5D5D]">
                    المميزات
                  </Label>
                  <Textarea
                    placeholder="اكتب مميزات المنتج..."
                    value={form.featuresAr}
                    onChange={(e) =>
                      setForm({ ...form, featuresAr: e.target.value })
                    }
                    rows={3}
                    className="bg-white border-[#E8E0D8] text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#5D5D5D]">
                    طريقة الاستخدام
                  </Label>
                  <Textarea
                    placeholder="كيف يستخدم؟..."
                    value={form.usageAr}
                    onChange={(e) =>
                      setForm({ ...form, usageAr: e.target.value })
                    }
                    rows={3}
                    className="bg-white border-[#E8E0D8] text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#5D5D5D]">
                    المكونات
                  </Label>
                  <Textarea
                    placeholder="مما يتكون المنتج؟..."
                    value={form.ingredientsAr}
                    onChange={(e) =>
                      setForm({ ...form, ingredientsAr: e.target.value })
                    }
                    rows={3}
                    className="bg-white border-[#E8E0D8] text-base"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* 6. إعدادات إضافية (ظاهرة دائماً) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E0D8]">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.isFeatured}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, isFeatured: checked })
                    }
                  />
                  <Label className="cursor-pointer text-base">
                    🌟 منتج مميز
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, isActive: checked })
                    }
                  />
                  <Label className="cursor-pointer text-base">
                    ✅ نشط (ظاهر للمستخدمين)
                  </Label>
                </div>
              </div>
            </div>
          </section>

          {/* أزرار الحفظ */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-14 text-base"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button
              size="lg"
              className="flex-1 h-14 text-base bg-[#C9A962] hover:bg-[#B8956E] text-white font-bold"
              onClick={handleSave}
              disabled={isSaving || isUploadingImages}
            >
              {isSaving ? (
                <RefreshCw className="h-5 w-5 animate-spin ml-2" />
              ) : (
                <Save className="h-5 w-5 ml-2" />
              )}
              {selectedProduct ? "حفظ التغييرات" : "إضافة المنتج"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
