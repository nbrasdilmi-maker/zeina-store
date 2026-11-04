import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { sendNotificationToAdmins } from "@/lib/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema for new journal entry
const journalEntrySchema = z.object({
  referenceNumber: z.string().optional(),
  type: z.enum([
    "SALE",
    "COLLECTION",
    "PURCHASE",
    "SUPPLY",
    "RETURN",
    "OPERATING_EXPENSE",
  ]),
  amount: z.number().refine((val) => val > 0, "المبلغ يجب أن يكون أكبر من صفر"),
  description: z.string().min(1, "البيان مطلوب"),
  supplierId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  isManual: z.boolean().default(true), // تمييز القيود اليدوية
});

// GET /api/accounting/journal - جلب القيود والإحصائيات
export async function GET(request: NextRequest) {
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

    // التحقق من صلاحية create_journal
    let hasCreateJournal = user.role === "ADMIN";
    if (!hasCreateJournal && dbUser?.permissions) {
      try {
        const permissions = JSON.parse(dbUser.permissions);
        hasCreateJournal = permissions.includes("create_journal");
      } catch (e) {}
    }

    if (!hasCreateJournal) {
      return NextResponse.json(
        { error: "غير مصرح لك بإضافة قيود" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const demoSessionId = (user as any)?.demoSessionId;

    const where: any = {};
    if (demoSessionId) where.demoSessionId = demoSessionId;
    if (type) where.type = type;
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, type: true } },
        order: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // حساب الإحصائيات (المبيعات - المشتريات - المصروفات - الصافي)
    let totalSales = 0;
    let totalPurchases = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      const amount = Math.abs(t.amount);
      if (t.type === "SALE") totalSales += amount;
      else if (t.type === "PURCHASE" || t.type === "SUPPLY")
        totalPurchases += amount;
      else if (t.type === "OPERATING_EXPENSE") totalExpenses += amount;
      // COLLECTION و RETURN لا تدخل في هذه الإحصائيات الأساسية
    });

    const net = totalSales - totalPurchases - totalExpenses;

    return NextResponse.json({
      transactions,
      stats: {
        totalSales,
        totalPurchases,
        totalExpenses,
        net,
      },
    });
  } catch (error) {
    console.error("Journal API error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

// POST /api/accounting/journal - إضافة قيد جديد (يدوي)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const validated = journalEntrySchema.parse(body);

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

    // تحديد علامة المبلغ (موجب للإيرادات، سالب للمصروفات والمشتريات)
    let amount = validated.amount;
    if (
      ["PURCHASE", "SUPPLY", "OPERATING_EXPENSE", "RETURN"].includes(
        validated.type,
      )
    ) {
      amount = -amount; // سالب
    }

    const demoSessionId = (user as any)?.demoSessionId;

    const transaction = await db.transaction.create({
      data: {
        referenceNumber: validated.referenceNumber || null,
        type: validated.type,
        amount,
        description: validated.description,
        supplierId: validated.supplierId || null,
        orderId: validated.orderId || null,
        demoSessionId,
      },
      include: {
        supplier: { select: { name: true } },
      },
    });

    // إرسال إشعار للإدارة
    const typeLabels: Record<string, string> = {
      SALE: "مبيعات",
      COLLECTION: "تحصيل",
      PURCHASE: "مشتريات",
      SUPPLY: "توريد",
      RETURN: "مرتجعات",
      OPERATING_EXPENSE: "مصروف تشغيلي",
    };
    const typeLabel = typeLabels[validated.type] || validated.type;

    await sendNotificationToAdmins({
      type: "SYSTEM",
      title: "📝 قيد يومي جديد",
      message: `قام ${user.name} بإضافة قيد ${typeLabel} بقيمة ${validated.amount.toLocaleString()} ر.ي - ${validated.description}`,
      data: { transactionId: transaction.id },
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    console.error("Create journal entry error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة القيد" },
      { status: 500 },
    );
  }
}
