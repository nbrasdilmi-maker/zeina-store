import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import {
  sendNotificationToAdmins,
  sendNotificationToUser,
} from "@/lib/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const returnSchema = z.object({
  orderId: z.string().optional(),
  productId: z.string().min(1, "المنتج مطلوب"),
  quantity: z.number().min(1, "الكمية يجب أن تكون 1 على الأقل"),
  reason: z.string().min(1, "سبب المرتجع مطلوب"),
  refundAmount: z
    .number()
    .min(0, "مبلغ الاسترداد يجب أن يكون أكبر من أو يساوي 0"),
});

// GET: جلب سجل المرتجعات
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const demoSessionId = (user as any)?.demoSessionId;

    // نجلب المرتجعات من جدول InventoryTransaction (نوع RETURN) مع عزل الجلسة التجريبية
    const returns = await db.inventoryTransaction.findMany({
      where: { ...(demoSessionId ? { demoSessionId } : {}), type: "RETURN" },
      include: {
        product: { select: { nameAr: true, mainImage: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // نجلب الحركات المالية المرتبطة بالمرتجعات (نوع RETURN) مع عزل الجلسة التجريبية
    const financialReturns = await db.transaction.findMany({
      where: { ...(demoSessionId ? { demoSessionId } : {}), type: "RETURN" },
      include: {
        order: { select: { id: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // دمج البيانات لتنسيق موحد
    const combined = returns.map((r) => {
      const relatedTx = financialReturns.find((tx) =>
        tx.description?.includes(r.productId),
      );
      return {
        id: r.id,
        product: r.product,
        quantity: r.quantity,
        reason: r.notes,
        refundAmount: relatedTx ? Math.abs(relatedTx.amount) : 0,
        orderId: relatedTx?.order?.id,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ returns: combined });
  } catch (error) {
    console.error("Returns GET error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

// POST: إضافة مرتجع جديد
// POST: إضافة مرتجع جديد (مع عكس تأثير البيع الأصلي)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = await request.json();
    const validated = returnSchema.parse(body);

    const demoSessionId = (user as any)?.demoSessionId;

    // جلب المنتج للتأكد من وجوده وأنه ينتمي لجلسة التجريبي الحالية
    const product = await db.product.findUnique({
      where: {
        id: validated.productId,
        ...(demoSessionId ? { demoSessionId } : {}),
      },
      include: { merchant: true },
    });
    if (!product)
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });

    // إذا كان هناك orderId، نتحقق من وجود الطلب وأن المنتج كان ضمنه
    let originalOrder: any = null;
    if (validated.orderId) {
      originalOrder = await db.order.findUnique({
        where: { id: validated.orderId },
        include: {
          items: {
            include: { product: { include: { merchant: true } } },
          },
        },
      });
      if (!originalOrder) {
        return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
      }

      // التحقق من أن المنتج موجود في الطلب
      const orderItem = originalOrder.items.find(
        (item: any) => item.productId === validated.productId,
      );
      if (!orderItem) {
        return NextResponse.json(
          { error: "المنتج غير موجود في هذا الطلب" },
          { status: 400 },
        );
      }

      // التحقق من أن الكمية المرتجعة لا تتجاوز الكمية المباعة
      if (validated.quantity > orderItem.quantity) {
        return NextResponse.json(
          {
            error: `الكمية المرتجعة (${validated.quantity}) أكبر من الكمية المباعة (${orderItem.quantity})`,
          },
          { status: 400 },
        );
      }
    }

    // استخدام transaction لضمان تناسق البيانات
    const result = await db.$transaction(async (tx) => {
      // 1. إعادة الكمية إلى المخزون (مع عزل الجلسة التجريبية)
      await tx.product.update({
        where: {
          id: validated.productId,
          ...(demoSessionId ? { demoSessionId } : {}),
        },
        data: {
          stock: { increment: validated.quantity },
          ...(demoSessionId ? { demoSessionId } : {}),
        },
      });

      // 2. تسجيل حركة مخزنية (مرتجع) مع عزل الجلسة التجريبية
      const inventoryTx = await tx.inventoryTransaction.create({
        data: {
          productId: validated.productId,
          quantity: validated.quantity,
          type: "RETURN",
          notes: validated.reason,
          reference: validated.orderId || undefined,
          ...(demoSessionId ? { demoSessionId } : {}),
        },
      });

      // 3. عكس تأثير البيع الأصلي (إذا كان مرتبطاً بطلب)
      if (originalOrder) {
        const orderItem = originalOrder.items.find(
          (item: any) => item.productId === validated.productId,
        );

        // إذا كان المنتج يتبع تاجراً، نقوم بإنقاص مبيعاته وعمولته
        if (product.merchantId && product.merchant) {
          const itemTotal = orderItem.price * validated.quantity;
          const commission =
            itemTotal * (product.merchant.commissionAmount / 100);

          await tx.merchant.update({
            where: {
              id: product.merchantId,
              ...(demoSessionId ? { demoSessionId } : {}),
            },
            data: {
              totalSales: { decrement: itemTotal },
              totalCommission: { decrement: commission },
              ...(demoSessionId ? { demoSessionId } : {}),
            },
          });
        }

        // 4. تسجيل حركة مالية (استرداد) – قيمة سالبة = خروج مال من الصندوق
        // نستخدم نفس مبلغ البيع الأصلي للوحدة الواحدة
        const refundAmount = orderItem.price * validated.quantity;
        const financialTx = await tx.transaction.create({
          data: {
            type: "RETURN",
            amount: -refundAmount,
            description: `مرتجع من طلب #${originalOrder.id.slice(-8)}: ${product.nameAr} (${validated.quantity} قطعة) - ${validated.reason}`,
            orderId: validated.orderId,
            ...(demoSessionId ? { demoSessionId } : {}),
          },
        });

        // ملاحظة: لا نحتسب هذا كخسارة لأننا نعكس الإيراد الأصلي.
        // الخسارة الحقيقية تحدث فقط إذا بعنا المنتج بأقل من سعر التكلفة، وهذا منطق منفصل.

        return { inventoryTx, financialTx };
      } else {
        // مرتجع غير مرتبط بطلب (مثل إرجاع منتج تالف بدون فاتورة)
        const financialTx = await tx.transaction.create({
          data: {
            type: "RETURN",
            amount: -Math.abs(validated.refundAmount),
            description: `مرتجع منتج: ${product.nameAr} (${validated.quantity} قطعة) - ${validated.reason}`,
            ...(demoSessionId ? { demoSessionId } : {}),
          },
        });
        return { inventoryTx, financialTx };
      }
    });

    // إرسال إشعار للإدارة
    await sendNotificationToAdmins({
      type: "SYSTEM",
      title: "🔄 مرتجع جديد",
      message: `تم تسجيل مرتجع للمنتج ${product.nameAr} (${validated.quantity} قطعة) بواسطة ${user.name}`,
      data: { productId: validated.productId, orderId: validated.orderId },
    });

    // إرسال إشعار للتاجر إذا كان المنتج يخص تاجراً
    if (product.merchant?.userId) {
      await sendNotificationToUser({
        userId: product.merchant.userId,
        type: "SYSTEM",
        title: "🔄 مرتجع على منتجك",
        message: `تم تسجيل مرتجع على منتج "${product.nameAr}" (${validated.quantity} قطعة). تم خصم المبلغ من مبيعاتك.`,
        data: { productId: validated.productId },
      });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    console.error("Returns POST error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة المرتجع" },
      { status: 500 },
    );
  }
}
