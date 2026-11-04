import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

// 1. جلب جميع الإعلانات الترويجية (مع عزل الجلسة التجريبية)
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        const demoSessionId = (user as any)?.demoSessionId;

        const where: Record<string, unknown> = {};
        // Demo sessions only see their own ads; visitors see the base set.
        where.demoSessionId = demoSessionId ?? null;

        const ads = await db.advertisement.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ advertisements: ads });
    } catch (error) {
        console.error("Error fetching advertisements:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الإعلانات" }, { status: 500 });
    }
}

// 2. إضافة إعلان ترويجي جديد
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
        }

        const decoded = user as any;
        const demoSessionId = decoded.demoSessionId;

        const body = await req.json();

        const ad = await db.advertisement.create({
            data: {
                title: body.title || "",
                titleAr: body.titleAr || "",
                description: body.description,
                descriptionAr: body.descriptionAr,
                price: body.price ? parseFloat(body.price) : null,
                image: body.image,
                link: body.link,
                ctaAr: body.ctaAr,
                isActive: body.isActive ?? true,
                demoSessionId,
            }
        });

        return NextResponse.json({ success: true, advertisement: ad, message: "تم إضافة الإعلان بنجاح" });
    } catch (error) {
        console.error("Error creating advertisement:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة الإعلان" }, { status: 500 });
    }
}

// 3. حذف إعلان نهائياً
export async function DELETE(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
        }

        const decoded = user as any;
        const demoSessionId = decoded.demoSessionId;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "معرف الإعلان مطلوب" }, { status: 400 });
        }

        const existing = await db.advertisement.findUnique({
            where: { id },
            select: { demoSessionId: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "الإعلان غير موجود" }, { status: 404 });
        }

        if (demoSessionId && existing.demoSessionId !== demoSessionId) {
            return NextResponse.json({ error: "غير مسموح لك بحذف هذا الإعلان" }, { status: 403 });
        }

        await db.advertisement.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "تم حذف الإعلان بنجاح" });
    } catch (error) {
        console.error("Error deleting advertisement:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء حذف الإعلان" }, { status: 500 });
    }
}
