import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - جلب طلبات منتجات التاجر
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const decoded = user as any;
        if (decoded.role !== "MERCHANT") {
            return NextResponse.json(
                { success: false, error: "هذه الميزة للتاجر فقط" },
                { status: 403 }
            );
        }

        const demoSessionId = decoded.demoSessionId;

        const merchant = await db.merchant.findFirst({
            where: { userId: decoded.userId },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: "لم يتم العثور على بيانات التاجر" },
                { status: 404 }
            );
        }

        const products = await db.product.findMany({
            where: { merchantId: merchant.id },
            select: { id: true },
        });

        const productIds = products.map((p) => p.id);

        const where: Record<string, unknown> = {
            productId: { in: productIds },
        };
        if (demoSessionId) {
          where.demoSessionId = demoSessionId;
        }

        const orderItems = await db.orderItem.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        nameAr: true,
                    },
                },
                order: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        createdAt: true,
                        customerId: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            success: true,
            orderItems,
        });
    } catch (error) {
        console.error("Merchant orders error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}
