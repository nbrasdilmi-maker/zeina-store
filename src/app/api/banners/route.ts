import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

// 1. جلب جميع البنرات (مع عزل الجلسة التجريبية)
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        const demoSessionId = (user as any)?.demoSessionId;

        const where: Record<string, unknown> = {};
        // Demo sessions only see their own banners; visitors see the base set.
        where.demoSessionId = demoSessionId ?? null;

        const banners = await db.heroBanner.findMany({
            where,
            orderBy: { order: 'asc' }
        });
        return NextResponse.json({ banners });
    } catch (error) {
        console.error("Error fetching banners:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء جلب البنرات" }, { status: 500 });
    }
}

// 2. إضافة بنر جديد من لوحة التحكم
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
        }

        const decoded = user as any;
        const demoSessionId = decoded.demoSessionId;

        const body = await req.json();

        const banner = await db.heroBanner.create({
            data: {
                title: body.title || "",
                titleAr: body.titleAr || "",
                subtitleAr: body.subtitleAr,
                description: body.description,
                descriptionAr: body.descriptionAr,
                image: body.image,
                link: body.link,
                ctaAr: body.ctaAr,
                order: parseInt(body.order) || 0,
                isActive: body.isActive ?? true,
                demoSessionId,
            }
        });

        return NextResponse.json({ success: true, banner, message: "تم إضافة البنر بنجاح" });
    } catch (error) {
        console.error("Error creating banner:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة البنر" }, { status: 500 });
    }
}

// 3. حذف بنر نهائياً
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
            return NextResponse.json({ error: "معرف البنر مطلوب" }, { status: 400 });
        }

        const existing = await db.heroBanner.findUnique({
            where: { id },
            select: { demoSessionId: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "البنر غير موجود" }, { status: 404 });
        }

        if (demoSessionId && existing.demoSessionId !== demoSessionId) {
            return NextResponse.json({ error: "غير مسموح لك بحذف هذا البنر" }, { status: 403 });
        }

        await db.heroBanner.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "تم حذف البنر بنجاح" });
    } catch (error) {
        console.error("Error deleting banner:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء حذف البنر" }, { status: 500 });
    }
}
