import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/accounting/cashflow - جلب بيانات الصندوق والحركات المالية
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    // جلب الحركات المالية (معزولة حسب الجلسة التجريبية)
    const transactions = await db.transaction.findMany({
      ...(demoSessionId ? { where: { demoSessionId } } : {}),
      include: {
        supplier: {
          select: {
            name: true,
            type: true,
          },
        },
        order: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // حساب الإحصائيات
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalReturns = 0;
    let totalPurchases = 0;

    transactions.forEach((t) => {
      if (t.amount > 0) {
        totalIncome += t.amount;
      } else {
        totalExpenses += Math.abs(t.amount);
      }

      if (t.type === "RETURN") {
        totalReturns += Math.abs(t.amount);
      }
      if (t.type === "PURCHASE" || t.type === "SUPPLY") {
        totalPurchases += Math.abs(t.amount);
      }
    });

    const currentBalance = totalIncome - totalExpenses;

    return NextResponse.json({
      stats: {
        currentBalance,
        totalIncome,
        totalExpenses,
        totalReturns,
        totalPurchases,
        totalTransactions: transactions.length,
      },
      transactions,
    });
  } catch (error) {
    console.error("Cashflow API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات الصندوق" },
      { status: 500 },
    );
  }
}
