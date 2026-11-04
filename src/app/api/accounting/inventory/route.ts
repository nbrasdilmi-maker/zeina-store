import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import {
  sendNotificationToAdmins,
  sendNotificationToUser,
} from "@/lib/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema for creating/updating product
const productSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  nameAr: z.string().min(1, "الاسم العربي مطلوب"),
  price: z.number().min(0, "السعر يجب أن يكون أكبر من أو يساوي 0"),
  costPrice: z
    .number()
    .min(0, "سعر التكلفة يجب أن يكون أكبر من أو يساوي 0")
    .optional()
    .nullable(),
  stock: z.number().min(0, "الكمية يجب أن تكون أكبر من أو يساوي 0"),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  mainImage: z
    .string()
    .url("رابط الصورة الرئيسية غير صالح")
    .optional()
    .nullable(),
  descriptionAr: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  lowStockAlert: z.number().min(0).optional().nullable(),
});

// GET /api/accounting/inventory - جلب المنتجات مع الإحصائيات
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const supplierId = searchParams.get("supplierId");
    const search = searchParams.get("search");
    const lowStock = searchParams.get("lowStock") === "true";

    const demoSessionId = (user as any)?.demoSessionId;

    const where: any = {};

    // عزل البيانات حسب الجلسة التجريبية
    if (demoSessionId) {
      where.demoSessionId = demoSessionId;
    }

    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (lowStock) where.stock = { lt: 5 };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nameAr: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    // جلب المنتجات مع العلاقات (معزولة حسب الجلسة التجريبية)
    const products = await db.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, nameAr: true },
        },
        supplier: {
          select: { id: true, name: true, type: true },
        },
        merchant: {
          select: { id: true, storeName: true },
        },
        agent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // إحصائيات المخزون (معزولة حسب الجلسة التجريبية)
    const totalProducts = await db.product.count({
      where: { ...where, isActive: true },
    });
    const lowStockProducts = await db.product.count({
      where: { ...where, isActive: true, stock: { lt: 5 } },
    });

    const productsForValue = await db.product.findMany({
      where: { ...where, isActive: true },
      select: { costPrice: true, stock: true },
    });
    const inventoryValue = productsForValue.reduce((total, p) => {
      return total + (p.costPrice || 0) * p.stock;
    }, 0);

    // جلب التصنيفات للفلتر (معزولة حسب الجلسة التجريبية)
    const categories = await db.category.findMany({
      ...(demoSessionId ? { where: { demoSessionId } } : {}),
      select: { id: true, nameAr: true },
    });

    // جلب الموردين للفلتر (معزولة حسب الجلسة التجريبية)
    const suppliers = await db.supplier.findMany({
      ...(demoSessionId ? { where: { demoSessionId } } : {}),
      select: { id: true, name: true, type: true },
    });

    return NextResponse.json({
      products,
      stats: {
        totalProducts,
        lowStockProducts,
        inventoryValue,
      },
      filters: {
        categories,
        suppliers,
      },
    });
  } catch (error) {
    console.error("Inventory API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات المخازن" },
      { status: 500 },
    );
  }
}

// POST /api/accounting/inventory - إضافة منتج جديد
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // جلب المستخدم مع صلاحياته
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { permissions: true, role: true },
    });

    // التحقق من صلاحية manage_inventory
    let hasManageInventory = user.role === "ADMIN";
    if (!hasManageInventory && dbUser?.permissions) {
      try {
        const permissions = JSON.parse(dbUser.permissions);
        hasManageInventory = permissions.includes("manage_inventory");
      } catch (e) {}
    }

    if (!hasManageInventory) {
      return NextResponse.json(
        { error: "غير مصرح لك بإدارة المخزون" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = productSchema.parse(body);

    // التحقق من وجود التصنيف إذا تم إرساله
    if (validated.categoryId) {
      const category = await db.category.findUnique({
        where: { id: validated.categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "التصنيف غير موجود" },
          { status: 400 },
        );
      }
    }

    // التحقق من وجود المورد إذا تم إرساله
    if (validated.supplierId) {
      const supplier = await db.supplier.findUnique({
        where: { id: validated.supplierId },
      });
      if (!supplier) {
        return NextResponse.json(
          { error: "المورد غير موجود" },
          { status: 400 },
        );
      }
    }

    const demoSessionId = (user as any)?.demoSessionId;

    const product = await db.product.create({
      data: {
        name: validated.name,
        nameAr: validated.nameAr,
        price: validated.price,
        costPrice: validated.costPrice || null,
        stock: validated.stock,
        sku: validated.sku || null,
        mainImage: validated.mainImage || "/placeholder.png",
        descriptionAr: validated.descriptionAr || null,
        categoryId: validated.categoryId || null,
        supplierId: validated.supplierId || null,
        isActive: validated.isActive,
        images: JSON.stringify([validated.mainImage || "/placeholder.png"]),
        demoSessionId,
      },
      include: {
        category: { select: { nameAr: true } },
        supplier: { select: { name: true } },
      },
    });

    // تسجيل حركة مخزنية (توريد) مع عزل الجلسة التجريبية
    await db.inventoryTransaction.create({
      data: {
        productId: product.id,
        quantity: validated.stock,
        type: "PURCHASE",
        notes: `إضافة منتج جديد بواسطة ${user.name}`,
        demoSessionId,
      },
    });

    // تسجيل حركة مالية (تكلفة الشراء) مع عزل الجلسة التجريبية
    if (validated.costPrice && validated.stock > 0) {
      const totalCost = validated.costPrice * validated.stock;
      await db.transaction.create({
        data: {
          type: "PURCHASE",
          amount: -totalCost,
          description: `شراء منتج: ${validated.nameAr} (${validated.stock} قطعة)`,
          supplierId: validated.supplierId || null,
          demoSessionId,
        },
      });
    }

    // إرسال إشعار للإدارة
    await sendNotificationToAdmins({
      type: "PRODUCT_NEW",
      title: "📦 منتج جديد في المخازن",
      message: `تم إضافة منتج جديد "${validated.nameAr}" بواسطة ${user.name}`,
      data: { productId: product.id },
    });

    // إرسال إشعار للمورد إذا تم تحديده
    if (validated.supplierId) {
      const supplier = await db.supplier.findUnique({
        where: { id: validated.supplierId },
        select: { userId: true, name: true },
      });
      if (supplier?.userId) {
        await sendNotificationToUser({
          userId: supplier.userId,
          type: "PRODUCT_NEW",
          title: "📦 منتج جديد مرتبط بك",
          message: `تم إضافة منتج جديد "${validated.nameAr}" وربطه كمورد.`,
          data: { productId: product.id },
        });
      }
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة المنتج" },
      { status: 500 },
    );
  }
}
