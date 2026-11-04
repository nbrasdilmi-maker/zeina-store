import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/security";

/**
 * GET /api/admin/merchants
 * Get all merchants (admin only)
 */
export async function GET(request: NextRequest) {
    try {
        // Verify admin authentication
        const user = await verifyAuth(request);

        if (!user || user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "غير مصرح لك بالوصول" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // pending, approved, all

        const demoSessionId = (user as any)?.demoSessionId;

        // Build filter
        const where: { isApproved?: boolean; demoSessionId?: string } = {};
        if (demoSessionId) where.demoSessionId = demoSessionId;
        if (status === "pending") {
            where.isApproved = false;
        } else if (status === "approved") {
            where.isApproved = true;
        }

        // Get merchants with user data (isolated by demo session)
        const merchants = await db.merchant.findMany({
            where,
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
            orderBy: { createdAt: "desc" },
        });

        // Get stats (isolated by demo session)
        const totalCount = await db.merchant.count({ where });
        const pendingCount = await db.merchant.count({
            where: { ...where, isApproved: false },
        });
        const approvedCount = await db.merchant.count({
            where: { ...where, isApproved: true },
        });

        return NextResponse.json({
            merchants,
            stats: {
                total: totalCount,
                pending: pendingCount,
                approved: approvedCount,
            },
        });
    } catch {
        console.error("Get merchants error:");
        return NextResponse.json(
            { error: "حدث خطأ أثناء جلب بيانات التجار" },
            { status: 500 }
        );
    }
}