"use client";

import { useState, useEffect, useRef } from "react";
import {
    Image as ImageIcon, Plus, Trash2, Loader2, Link as LinkIcon,
    Type, RefreshCw, LayoutTemplate, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AdsManager() {
    const [banners, setBanners] = useState<any[]>([]);
    const [promos, setPromos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // States for Modals
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

    // States for Upload & Forms
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form Data
    const [formData, setFormData] = useState({
        titleAr: "",       // العنوان الرئيسي
        subtitleAr: "",    // العنوان الفرعي (جديد)
        descriptionAr: "", // الوصف
        price: "",         // السعر (جديد للإعلانات)
        ctaAr: "",         // نص الزر (جديد)
        link: "",          // الرابط
        image: ""
    });

    // جلب البيانات عند فتح المكون
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [bannersRes, promosRes] = await Promise.all([
                fetch("/api/banners").then(res => res.json()),
                fetch("/api/advertisements").then(res => res.json())
            ]);
            setBanners(bannersRes.banners || []);
            setPromos(promosRes.advertisements || []);
        } catch (error) {
            toast({ title: "خطأ", description: "فشل جلب البيانات", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // دالة رفع الصور للسحابة مع عزل المجلدات
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, folder: "Banners" | "Promotions") => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // توجيه الصورة للمجلد الصحيح في السحابة بناءً على نوع الإعلان
            const folderPath = `/Store_UI/${folder}`;
            const result = await uploadImage(file, folderPath);

            if (result.success && result.url) {
                setFormData(prev => ({ ...prev, image: result.url! }));
                toast({ title: "تم الرفع بنجاح", description: `تم حفظ الصورة في مجلد ${folder}` });
            } else {
                throw new Error("فشل الرفع");
            }
        } catch (error) {
            toast({ title: "خطأ", description: "فشل رفع الصورة للسحابة", variant: "destructive" });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // حفظ البنر أو الإعلان
    const handleSave = async (type: "banner" | "promo") => {
        if (!formData.image || !formData.titleAr) {
            toast({ title: "تنبيه", description: "يرجى تعبئة العنوان والصورة على الأقل", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const endpoint = type === "banner" ? "/api/banners" : "/api/advertisements";
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    title: formData.titleAr, // نرسل العنوان العربي كعنوان افتراضي أيضاً
                    description: formData.descriptionAr,
                    price: formData.price,
                    subtitleAr: formData.subtitleAr,
                    ctaAr: formData.ctaAr,
                })
            });

            if (response.ok) {
                toast({ title: "تم بنجاح", description: "تمت إضافة العنصر بنجاح وعرضه في المتجر" });
                setIsBannerModalOpen(false);
                setIsPromoModalOpen(false);
                setFormData({ title: "", titleAr: "", description: "", link: "", image: "" });
                fetchData(); // تحديث القائمة
            }
        } catch (error) {
            toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // حذف بنر أو إعلان
    const handleDelete = async (id: string, type: "banner" | "promo") => {
        if (!confirm("هل أنت متأكد من الحذف نهائياً؟ ستختفي من الواجهة فوراً.")) return;

        try {
            const endpoint = type === "banner" ? `/api/banners?id=${id}` : `/api/advertisements?id=${id}`;
            const response = await fetch(endpoint, { method: "DELETE" });

            if (response.ok) {
                toast({ title: "تم الحذف", description: "تم مسح العنصر نهائياً" });
                fetchData();
            }
        } catch (error) {
            toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" });
        }
    };

    // نموذج الإضافة (يستخدم للبنرات والإعلانات)
    const renderForm = (type: "banner" | "promo") => (
        <div className="space-y-4 mt-4">
            {/* قسم رفع الصورة */}
            <div className="space-y-2">
                <Label className="font-bold text-[#8B7355]">صورة الإعلان الفخمة *</Label>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${formData.image ? 'border-[var(--gold)] bg-amber-50' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                    {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" /> :
                        formData.image ? <img src={formData.image} alt="Preview" className="max-h-32 object-contain" /> :
                            <div className="text-center"><ImageIcon className="mx-auto h-8 w-8 text-gray-400" /><p className="text-xs mt-2">اضغط لرفع الصورة من جهازك</p></div>}
                </div>
                <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => handleImageUpload(e, type === "banner" ? "Banners" : "Promotions")} />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {/* العنوان الفرعي - Subtitle */}
                <div className="space-y-1">
                    <Label className="text-xs font-bold">العنوان الفرعي (مثل: زينة)</Label>
                    <Input placeholder="أدخل النص الصغير العلوي" value={formData.subtitleAr} onChange={e => setFormData({ ...formData, subtitleAr: e.target.value })} />
                </div>

                {/* العنوان الرئيسي - Title */}
                <div className="space-y-1">
                    <Label className="text-xs font-bold">العنوان الرئيسي (مثل: اكتشف عالم الأناقة) *</Label>
                    <Input placeholder="أدخل العنوان العريض" value={formData.titleAr} onChange={e => setFormData({ ...formData, titleAr: e.target.value })} />
                </div>

                {/* الوصف - Description */}
                <div className="space-y-1">
                    <Label className="text-xs font-bold">الوصف القصير</Label>
                    <Textarea placeholder="أدخل وصفاً جذاباً يشرح العرض" value={formData.descriptionAr} onChange={e => setFormData({ ...formData, descriptionAr: e.target.value })} rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {/* نص الزر - CTA */}
                    <div className="space-y-1">
                        <Label className="text-xs font-bold">نص الزر (مثل: تسوق الآن)</Label>
                        <Input placeholder="ماذا يكتب على الزر؟" value={formData.ctaAr} onChange={e => setFormData({ ...formData, ctaAr: e.target.value })} />
                    </div>
                    {/* الرابط - Link */}
                    <div className="space-y-1">
                        <Label className="text-xs font-bold">رابط التوجه (Link)</Label>
                        <Input placeholder="/products/..." value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} dir="ltr" />
                    </div>
                </div>

                {/* حقل السعر يظهر فقط في الإعلانات الترويجية (Promos) */}
                {type === "promo" && (
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-green-600">السعر المعروض (اختياري)</Label>
                        <Input type="number" placeholder="مثال: 5000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                    </div>
                )}
            </div>

            <Button
                className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white font-bold h-12 rounded-xl mt-2"
                onClick={() => handleSave(type)}
                disabled={isSubmitting || isUploading || !formData.image}
            >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "نشر الإعلان فوراً ✨"}
            </Button>
        </div>
    );

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-[var(--gold)]" />
                        إدارة واجهة المتجر والإعلانات
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">تحكم بالصور الفخمة والبنرات التي تظهر للعملاء في الصفحة الرئيسية.</p>
                </div>
            </div>

            <Tabs defaultValue="banners" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-gray-100 p-1 rounded-xl">
                    <TabsTrigger value="banners" className="text-sm md:text-base font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-[var(--gold)] data-[state=active]:shadow-sm">
                        <LayoutTemplate className="h-4 w-4 ml-2" /> البنرات الرئيسية (السلايدر)
                    </TabsTrigger>
                    <TabsTrigger value="promos" className="text-sm md:text-base font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-[var(--gold)] data-[state=active]:shadow-sm">
                        <Megaphone className="h-4 w-4 ml-2" /> الإعلانات الترويجية
                    </TabsTrigger>
                </TabsList>

                {/* تابة البنرات */}
                <TabsContent value="banners" className="mt-6 space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => { setFormData({ title: "", titleAr: "", description: "", link: "", image: "" }); setIsBannerModalOpen(true); }} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white rounded-xl shadow-md">
                            <Plus className="h-4 w-4 ml-2" /> إضافة بنر جديد
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {banners.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">لا توجد بنرات حالياً. أضف بنر فخم ليزين واجهة متجرك!</p>
                            </div>
                        ) : (
                            banners.map((banner) => (
                                <Card key={banner.id} className="overflow-hidden group rounded-2xl border-gray-200 hover:border-[var(--gold)] transition-all">
                                    <div className="relative h-40 bg-gray-100">
                                        <img src={banner.image} alt={banner.titleAr} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(banner.id, "banner")} className="rounded-full shadow-lg">
                                                <Trash2 className="h-4 w-4 ml-2" /> حذف نهائي
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-bold text-gray-800 line-clamp-1">{banner.titleAr}</h3>
                                        {banner.descriptionAr && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{banner.descriptionAr}</p>}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* تابة الإعلانات */}
                <TabsContent value="promos" className="mt-6 space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => { setFormData({ title: "", titleAr: "", description: "", link: "", image: "" }); setIsPromoModalOpen(true); }} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white rounded-xl shadow-md">
                            <Plus className="h-4 w-4 ml-2" /> إضافة إعلان ترويجي
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {promos.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">لا توجد إعلانات ترويجية حالياً.</p>
                            </div>
                        ) : (
                            promos.map((promo) => (
                                <Card key={promo.id} className="overflow-hidden group rounded-2xl border-gray-200 hover:border-orange-300 transition-all">
                                    <div className="relative h-48 bg-gray-100 p-2">
                                        <img src={promo.image} alt={promo.titleAr} className="w-full h-full object-contain rounded-lg" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(promo.id, "promo")} className="rounded-full shadow-lg">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-3 bg-white">
                                        <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{promo.titleAr}</h3>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* نافذة إضافة بنر */}
            <Dialog open={isBannerModalOpen} onOpenChange={setIsBannerModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>رفع بنر رئيسي فخم</DialogTitle>
                        <DialogDescription>سيظهر هذا البنر في السلايدر المتحرك أعلى المتجر.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] px-1">{renderForm("banner")}</ScrollArea>
                </DialogContent>
            </Dialog>

            {/* نافذة إضافة إعلان */}
            <Dialog open={isPromoModalOpen} onOpenChange={setIsPromoModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>رفع إعلان ترويجي</DialogTitle>
                        <DialogDescription>ستظهر هذه الكروت الإعلانية في الواجهة الرئيسية للمتجر.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] px-1">{renderForm("promo")}</ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}