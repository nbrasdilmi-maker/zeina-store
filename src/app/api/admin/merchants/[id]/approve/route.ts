import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { checkRateLimit, logSecurityEvent } from "@/lib/security";
import { sendNotificationToUser } from "@/lib/notifications";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/merchants/[id]/approve
 * Approve or reject a merchant (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const ip = request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    try {
        // Verify admin authentication
        const user = await verifyAuth(request);

        if (!user || user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "غير مصرح لك بالوصول" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { approved, commissionAmount } = body;

        // Validate input
        if (typeof approved !== "boolean") {
            return NextResponse.json(
                { error: "يجب تحديد حالة الموافقة" },
                { status: 400 }
            );
        }

        // Check if merchant exists
        const merchant = await db.merchant.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { error: "التاجر غير موجود" },
                { status: 404 }
            );
        }

        const demoSessionId = (user as any)?.demoSessionId ?? null;
        if ((merchant.demoSessionId ?? null) !== demoSessionId) {
            return NextResponse.json(
                { error: "غير مسموح لك بإدارة هذا التاجر" },
                { status: 403 }
            );
        }

        // Update merchant
        const updatedMerchant = await db.merchant.update({
            where: { id },
            data: {
                isApproved: approved,
                isActive: approved,
                commissionAmount: commissionAmount || merchant.commissionAmount,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        // Create notification for merchant
        await sendNotificationToUser({
            userId: merchant.userId,
            type: approved ? "MERCHANT_APPROVED" : "SYSTEM",
            title: approved ? "تم تفعيل حسابك 🎉" : "تحديث بخصوص طلبك ⚠️",
            message: approved
                ? "مبروك! تمت الموافقة على طلبك كتاجر في زينة. يمكنك الآن إضافة منتجاتك والبدء في البيع."
                : "نأسف، تم رفض طلب التسجيل كتاجر. يرجى التواصل مع الإدارة للمزيد من التفاصيل.",
            data: { merchantId: id }
        });

        // Log the action
        logSecurityEvent({
            action: approved ? "MERCHANT_APPROVED" : "MERCHANT_REJECTED",
            userId: user.id,
            ip,
            userAgent,
            status: "SUCCESS",
            details: `Merchant: ${merchant.storeName} (${merchant.email})`,
        });

        return NextResponse.json({
            success: true,
            message: approved ? "تم تفعيل التاجر بنجاح" : "تم رفض التاجر",
            merchant: updatedMerchant,
        });
    } catch {
        console.error("Approve merchant error:");

        return NextResponse.json(
            { error: "حدث خطأ أثناء تحديث حالة التاجر" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/merchants/[id]/approve
 * Get single merchant details (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        // Verify admin authentication
        const user = await verifyAuth(request);

        if (!user || user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "غير مصرح لك بالوصول" },
                { status: 403 }
            );
        }

        const { id } = await params;

        const merchant = await db.merchant.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        isVerified: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!merchant) {
            return NextResponse.json(
                { error: "التاجر غير موجود" },
                { status: 404 }
            );
        }

        // Get merchant's products count
        const productsCount = await db.product.count({
            where: { merchantId: id },
        });

        // Get merchant's sales stats
        const salesStats = await db.orderItem.aggregate({
            where: {
                product: { merchantId: id },
            },
            _sum: {
                price: true,
            },
            _count: {
                _all: true,
            },
        });

        return NextResponse.json({
            merchant,
            stats: {
                productsCount,
                totalSales: salesStats._sum.price || 0,
                ordersCount: salesStats._count._all,
            },
        });
    } catch {
        console.error("Get merchant error:");
        return NextResponse.json(
            { error: "حدث خطأ أثناء جلب بيانات التاجر" },
            { status: 500 }
        );
    }
}