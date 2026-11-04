import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { decryptData } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET /api/accounting/orders - جلب جميع الطلبات مع التفاصيل الكاملة
export async function GET(request: NextRequest) {
  try {
    // التحقق من صلاحية المستخدم (يجب أن يكون مسجل دخول وله صلاحية محاسبية)
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    // جلب الطلبات مع جميع التفاصيل المطلوبة (معزولة حسب الجلسة التجريبية)
    const orders = await db.order.findMany({
      ...(demoSessionId ? { where: { demoSessionId } } : {}),
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                merchant: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                      },
                    },
                  },
                },
                agent: {
                  select: { id: true, name: true, email: true, phone: true },
                },
              },
            },
          },
        },
        governorateRel: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
        transactions: true, // الحركات المالية المرتبطة بالطلب
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // فك تشفير paymentDetails لكل طلب
    const decryptedOrders = orders.map((order) => ({
      ...order,
      paymentDetails: order.paymentDetails
        ? decryptData(order.paymentDetails)
        : null,
    }));

    return NextResponse.json({ orders: decryptedOrders });
  } catch (error) {
    console.error("Accounting orders API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الطلبات" },
      { status: 500 },
    );
  }
}
