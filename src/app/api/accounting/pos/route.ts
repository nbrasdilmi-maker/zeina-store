import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { sendNotificationToAdmins } from "@/lib/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const posSaleSchema = z.object({
  customerName: z.string().min(1, "اسم العميل مطلوب"),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().min(1),
        price: z.number().min(0),
      }),
    )
    .min(1, "يجب إضافة منتج واحد على الأقل"),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(["cash", "transfer", "wallet"]).default("cash"),
  notes: z.string().optional(),
});

// POST /api/accounting/pos - إنشاء عملية بيع مباشر (POS)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // السماح فقط للأدمن والمندوبين
    // جلب المستخدم مع صلاحياته
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { permissions: true, role: true },
    });

    // السماح فقط للأدمن والمندوبين الحاصلين على صلاحية manage_orders
    let hasManageOrders = user.role === "ADMIN";
    if (!hasManageOrders && dbUser?.permissions) {
      try {
        const permissions = JSON.parse(dbUser.permissions);
        hasManageOrders = permissions.includes("manage_orders");
      } catch (e) {}
    }

    if (!hasManageOrders) {
      return NextResponse.json(
        { error: "غير مصرح لك بهذا الإجراء" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = posSaleSchema.parse(body);

    const demoSessionId = (user as any)?.demoSessionId;

    // التحقق من وجود المنتجات وكفاية المخزون (مع عزل الجلسة التجريبية)
    for (const item of validated.items) {
      const product = await db.product.findUnique({
        where: {
          id: item.productId,
          ...(demoSessionId ? { demoSessionId } : {}),
        },
      });
      if (!product) {
        return NextResponse.json(
          { error: `المنتج غير موجود: ${item.productId}` },
          { status: 404 },
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `المخزون غير كافٍ للمنتج: ${product.nameAr} (المتوفر: ${product.stock})`,
          },
          { status: 400 },
        );
      }
    }

    // إنشاء الطلب والحركات المالية والمخزنية داخل transaction (مع عزل الجلسة التجريبية)
    const result = await db.$transaction(async (tx) => {
      // 1. إنشاء طلب من نوع POS
      const order = await tx.order.create({
        data: {
          customerId: user.id, // نستخدم المستخدم الحالي كعميل مؤقت (أو يمكن إنشاء عميل عام)
          demoSessionId,
          totalAmount: validated.totalAmount,
          deliveryFee: 0, // البيع المباشر بدون توصيل
          paymentMethod: validated.paymentMethod,
          paymentStatus: "CONFIRMED", // مؤكد مباشرة
          paymentConfirmedBy: user.id,
          paymentConfirmedAt: new Date(),
          status: "COMPLETED", // مكتمل مباشرة
          source: "POS",
          posUserId: user.id,
          address: validated.customerAddress || "بيع مباشر",
          phone: validated.customerPhone || "-",
          notes:
            validated.notes || `بيع مباشر للعميل: ${validated.customerName}`,
          items: {
            create: validated.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 2. خصم المخزون (مع عزل الجلسة التجريبية)
      for (const item of validated.items) {
        await tx.product.update({
          where: {
            id: item.productId,
            ...(demoSessionId ? { demoSessionId } : {}),
          },
          data: {
            stock: { decrement: item.quantity },
            ...(demoSessionId ? { demoSessionId } : {}),
          },
        });
      }

      // 3. تسجيل حركة مالية (إيراد) مع عزل الجلسة التجريبية
      await tx.transaction.create({
        data: {
          type: "SALE",
          amount: validated.totalAmount,
          description: `بيع مباشر - ${validated.customerName} - طلب #${order.id.slice(-8)}`,
          orderId: order.id,
          ...(demoSessionId ? { demoSessionId } : {}),
        },
      });

      // 4. تسجيل حركات مخزنية (صرف) مع عزل الجلسة التجريبية
      for (const item of validated.items) {
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity, // سالب = صرف
            type: "SALE",
            reference: order.id,
            notes: `بيع مباشر للعميل ${validated.customerName}`,
            ...(demoSessionId ? { demoSessionId } : {}),
          },
        });
      }

      return order;
    });

    // إرسال إشعار للإدارة
    await sendNotificationToAdmins({
      type: "SYSTEM",
      title: "💰 عملية بيع مباشر",
      message: `قام ${user.name} بعملية بيع مباشر بقيمة ${validated.totalAmount.toLocaleString()} ر.ي للعميل ${validated.customerName}`,
      data: { orderId: result.id },
    });

    return NextResponse.json({
      success: true,
      order: result,
      message: "تمت عملية البيع بنجاح",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    console.error("POS sale error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء عملية البيع" },
      { status: 500 },
    );
  }
}
