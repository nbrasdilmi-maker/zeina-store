import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/accounting/suppliers - جلب الموردين مع الإحصائيات
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    // جلب جميع الموردين من جدول Supplier (معزولة حسب الجلسة التجريبية)
    const suppliers = await db.supplier.findMany({
      where: { ...(demoSessionId ? { demoSessionId } : {}) },
      include: {
        user: {
          select: { id: true, email: true, phone: true, role: true },
        },
        // جلب المنتجات التي أضافها المورد
        suppliedProducts: {
          select: {
            id: true,
            nameAr: true,
            price: true,
            costPrice: true,
            stock: true,
            mainImage: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // إحصائيات إضافية (معزولة حسب الجلسة التجريبية)
    const totalSuppliers = await db.supplier.count({
      where: { ...(demoSessionId ? { demoSessionId } : {}) },
    });
    const merchants = await db.merchant.findMany({
      where: { ...(demoSessionId ? { demoSessionId } : {}) },
      select: { commissionAmount: true, totalSales: true },
    });

    const totalCommission = merchants.reduce(
      (sum, m) => sum + m.totalSales * (m.commissionAmount / 100),
      0,
    );
    const highestCommission = merchants.length
      ? Math.max(...merchants.map((m) => m.commissionAmount))
      : 0;
    const avgCommission = merchants.length
      ? merchants.reduce((sum, m) => sum + m.commissionAmount, 0) /
        merchants.length
      : 0;

    // حساب مبيعات كل مورد (مجموع مبيعات منتجاته)
    const enrichedSuppliers = await Promise.all(
      suppliers.map(async (supplier) => {
        const productIds = supplier.suppliedProducts.map((p) => p.id);
        const salesData = await db.orderItem.aggregate({
          where: { productId: { in: productIds } },
          _sum: { price: true, quantity: true },
        });
        const totalSales = salesData._sum.price || 0;
        const totalQuantity = salesData._sum.quantity || 0;
        const commission = supplier.commission
          ? totalSales * (supplier.commission / 100)
          : 0;
        const netAmount = totalSales - commission;
        return {
          ...supplier,
          stats: { totalSales, totalQuantity, commission, netAmount },
        };
      }),
    );

    return NextResponse.json({
      suppliers: enrichedSuppliers,
      stats: {
        totalSuppliers,
        totalCommission,
        highestCommission,
        avgCommission,
      },
    });
  } catch (error) {
    console.error("Suppliers API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات الموردين" },
      { status: 500 },
    );
  }
}

// POST /api/accounting/suppliers - إضافة تاجر/مورد يدوياً
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { name, contactInfo, notes, commission, userId } = body;

    const demoSessionId = (user as any)?.demoSessionId;

    if (!name) {
      return NextResponse.json({ error: "اسم المورد مطلوب" }, { status: 400 });
    }

    // إذا تم إرسال userId، نتحقق من وجود المستخدم ونوعه وأنه ينتمي لجلسة التجريبي الحالية
    let type: "MERCHANT" | "AGENT" | "ADMIN" = "MERCHANT";
    let finalUserId = userId;
    if (userId) {
      const existingUser = await db.user.findUnique({
        where: {
          id: userId,
          ...(demoSessionId ? { demoSessionId } : {}),
        },
      });
      if (!existingUser) {
        return NextResponse.json(
          { error: "المستخدم غير موجود أو لا ينتمي لجلستك التجريبية" },
          { status: 400 },
        );
      }
      type = existingUser.role as any;
      // التأكد من عدم وجود مورد بنفس userId
      const existingSupplier = await db.supplier.findUnique({
        where: { userId },
      });
      if (existingSupplier) {
        return NextResponse.json(
          { error: "يوجد مورد مرتبط بهذا المستخدم بالفعل" },
          { status: 400 },
        );
      }
    } else {
      // إنشاء مورد بدون ربط بمستخدم
      finalUserId = null;
    }

    const supplier = await db.supplier.create({
      data: {
        name,
        type,
        commission: commission || null,
        contactInfo: contactInfo || null,
        notes: notes || null,
        userId: finalUserId,
        ...(demoSessionId ? { demoSessionId } : {}),
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة المورد" },
      { status: 500 },
    );
  }
}
