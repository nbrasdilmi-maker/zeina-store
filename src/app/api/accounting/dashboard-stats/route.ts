import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/accounting/dashboard-stats - جلب إحصائيات لوحة التحكم الرئيسية
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    // 1. إجمالي المبيعات (من الحركات المالية - نوع SALE فقط)
    const salesTransactions = await db.transaction.aggregate({
      where: { ...(demoSessionId ? { demoSessionId } : {}), type: "SALE" },
      _sum: { amount: true },
    });
    const totalSales = salesTransactions._sum.amount || 0;

    // 2. إجمالي المصروفات (من الحركات المالية - المصروفات والمشتريات)
    const expenseTransactions = await db.transaction.aggregate({
      where: {
        ...(demoSessionId ? { demoSessionId } : {}),
        type: { in: ["OPERATING_EXPENSE", "PURCHASE", "SUPPLY"] },
      },
      _sum: { amount: true },
    });
    const totalExpenses = Math.abs(expenseTransactions._sum.amount || 0);

    // 3. صافي الأرباح (المبيعات - المصروفات)
    const totalProfit = totalSales - totalExpenses;

    // 4. الخسائر (من المرتجعات)
    const returnTransactions = await db.transaction.aggregate({
      where: { ...(demoSessionId ? { demoSessionId } : {}), type: "RETURN" },
      _sum: { amount: true },
    });
    const totalLoss = Math.abs(returnTransactions._sum.amount || 0);

    // 5. عدد المنتجات في المخازن (الإجمالي)
    const totalProducts = await db.product.count({
      where: { ...(demoSessionId ? { demoSessionId } : {}), isActive: true },
    });

    // 6. المنتجات المنخفضة المخزون (أقل من 5 قطع)
    const lowStockProducts = await db.product.count({
      where: {
        ...(demoSessionId ? { demoSessionId } : {}),
        isActive: true,
        stock: { lt: 5 },
      },
    });

    // 7. عدد الموردين (التجار + المناديب الذين أضافوا منتجات)
    const suppliersCount = await db.supplier.count({
      ...(demoSessionId ? { where: { demoSessionId } } : {}),
    });

    // 8. آخر 5 حركات مالية
    const recentTransactions = await db.transaction.findMany({
      ...(demoSessionId ? { where: { demoSessionId } } : {}),
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        order: { select: { id: true } },
      },
    });

    // 9. قيمة المخزون (مجموع (سعر التكلفة × الكمية) للمنتجات)
    const products = await db.product.findMany({
      where: { ...(demoSessionId ? { demoSessionId } : {}), isActive: true },
      select: { costPrice: true, stock: true },
    });
    const inventoryValue = products.reduce((total, p) => {
      return total + (p.costPrice || 0) * p.stock;
    }, 0);

    return NextResponse.json({
      stats: {
        totalSales,
        totalProfit,
        totalExpenses,
        totalLoss,
        totalProducts,
        lowStockProducts,
        totalSuppliers: suppliersCount,
        inventoryValue,
      },
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        description: t.description || t.type,
        amount: t.amount,
        date: t.createdAt,
        supplier: t.supplier?.name,
        orderId: t.order?.id,
      })),
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإحصائيات" },
      { status: 500 },
    );
  }
}
