import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

// 1. جلب التعليقات (مع عزل الجلسة التجريبية)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");

        if (!productId) {
            return NextResponse.json({ error: "معرف المنتج مطلوب" }, { status: 400 });
        }

        const user = await verifyAuth(request);
        const demoSessionId = (user as any)?.demoSessionId;

        const where: Record<string, unknown> = { productId, isActive: true };
        // Base reviews for visitors, session reviews for demo sessions.
        where.demoSessionId = demoSessionId ?? null;

        const reviews = await db.review.findMany({
            where,
            include: {
                user: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ reviews });
    } catch (error) {
        return NextResponse.json({ error: "فشل جلب التعليقات" }, { status: 500 });
    }
}

// 2. إضافة تقييم (مع التحقق من الجلسة التجريبية)
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
        }

        const decoded = user as any;
        const demoSessionId = decoded.demoSessionId;

        const body = await request.json();
        const { productId, userId, rating, comment } = body;

        // التحقق من أن المستخدم ينتمي للجلسة التجريبية
        if (demoSessionId) {
            const reviewUser = await db.user.findUnique({
                where: { id: userId },
                select: { demoSessionId: true },
            });
            if (!reviewUser || reviewUser.demoSessionId !== demoSessionId) {
                return NextResponse.json({ error: "غير مصرح لك بإضافة تقييم لهذا المستخدم" }, { status: 403 });
            }
        }

        // التحقق من أن المنتج ينتمي لنفس مساحة البيانات
        const reviewProduct = await db.product.findUnique({
            where: { id: productId },
            select: { demoSessionId: true },
        });
        if (!reviewProduct) {
            return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
        }
        if ((reviewProduct.demoSessionId ?? null) !== (demoSessionId ?? null)) {
            return NextResponse.json({ error: "غير مسموح لك بتقييم هذا المنتج" }, { status: 403 });
        }

        const review = await db.review.create({
            data: {
                productId,
                userId,
                demoSessionId,
                rating: parseInt(rating),
                comment,
            },
            include: {
                user: { select: { name: true } },
                product: { select: { id: true, nameAr: true, merchantId: true, agentId: true } }
            }
        });

        return NextResponse.json({ success: true, review });
    } catch (error) {
        console.error("POST Review Error:", error);
        return NextResponse.json({ error: "فشل العملية" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await verifyAuth(request);

        if (!user) {
            return NextResponse.json({ error: "بيانات غير مكتملة أو غير مصرح لك" }, { status: 401 });
        }

        const decoded = user as any;
        const demoSessionId = decoded.demoSessionId;

        const body = await request.json();
        const { reviewId } = body;

        const review = await db.review.findUnique({
            where: { id: reviewId },
            include: { product: true }
        });

        if (!review) return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });

        // التحقق من أن التقييم ينتمي لجلسة التجريبي الحالية
        if ((review.demoSessionId ?? null) !== (demoSessionId ?? null)) {
            return NextResponse.json({ error: "غير مسموح لك بحذف هذا التقييم" }, { status: 403 });
        }

        // التحقق من الصلاحيات
        const isAdmin = decoded.role === 'ADMIN';
        let isOwnerMerchant = false;

        if (decoded.role === 'MERCHANT') {
            const merchant = await db.merchant.findFirst({
                where: { userId: decoded.userId },
                select: { id: true },
            });
            isOwnerMerchant = !!merchant && review.product.merchantId === merchant.id;
        }

        if (isAdmin || isOwnerMerchant) {
            await db.review.delete({ where: { id: reviewId } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "لا تملك صلاحية الحذف" }, { status: 403 });
    } catch (error) {
        console.error("🔥 سبب الخطأ 500 هو:", error);
        return NextResponse.json({ error: "فشل في السيرفر" }, { status: 500 });
    }
}
