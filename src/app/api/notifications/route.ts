
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth"; // الدالة التي أرسلتها لي أنت
import { logSecurityEvent } from "@/lib/security";
import { Trash2, ExternalLink } from "lucide-react";

export async function GET(req: NextRequest) {
    try {
        // 1. التحقق من هوية المستخدم (Authentication Check)
        // نمرر الـ Request بالكامل لدالة verifyAuth لكي تقوم بفحص الـ Authorization Header
        const user = await verifyAuth(req);

        // إذا لم تنجح عملية التحقق (لا يوجد توكن أو التوكن غير صالح)
        if (!user || !user.id) {
            // تسجيل محاولة وصول غير مصرح بها لأغراض أمنية
            await logSecurityEvent({
                action: "UNAUTHORIZED_NOTIFICATIONS_ACCESS",
                userId: "GUEST",
                status: "FAILURE",
                details: "محاولة جلب إشعارات بدون توكن صالح"
            });

            return NextResponse.json(
                { error: "غير مصرح لك بالوصول. يرجى تسجيل الدخول أولاً." },
                { status: 401 }
            );
        }

        // 2. جلب الإشعارات من قاعدة البيانات
        // تصفية حسب المستخدم والجلسة التجريبية لعزل البيانات
        const demoSessionId = (user as any)?.demoSessionId;
        const where: Record<string, unknown> = {
            userId: user.id, // شرط: أن يكون الإشعار تابع للمستخدم المسجل حالياً
        };

        if (demoSessionId) {
          where.demoSessionId = demoSessionId;
        }

        const notifications = await db.notification.findMany({
            where,
            orderBy: {
                createdAt: "desc", // الترتيب: من الأحدث إلى الأقدم
            },
            take: 50, // جلب آخر 50 إشعار لضمان سرعة الأداء (Performance)
            select: {
                id: true,
                title: true,
                message: true,
                data: true,
                type: true,
                isRead: true,
                createdAt: true,
                // يمكنك إضافة حقول أخرى هنا إذا كانت موجودة في الـ Schema الخاص بك
            }
        });

        // 3. معالجة الرد (Response Handling)
        // إذا لم تكن هناك إشعارات، نرسل مصفوفة فارغة بدلاً من Null لتجنب الأخطاء في الواجهة
        if (!notifications) {
            return NextResponse.json([], { status: 200 });
        }

        // 4. إرسال البيانات بنجاح
        return NextResponse.json(notifications, {
            status: 200,
            headers: {
                "Cache-Control": "no-store, max-age=0", // لضمان عدم تخزين الإشعارات القديمة في المتصفح
            }
        });

    } catch (error: any) {
        // 5. إدارة الأخطاء (Error Management)
        console.error("Critical Error in Notifications API:", error);

        // تسجيل الخطأ في نظام الحماية
        await logSecurityEvent({
            action: "NOTIFICATIONS_FETCH_ERROR",
            status: "ERROR",
            details: error.message || "حدث خطأ غير متوقع أثناء جلب الإشعارات"
        });

        return NextResponse.json(
            { error: "حدث خطأ داخلي في الخادم أثناء معالجة طلبك." },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return new NextResponse("Unauthorized", { status: 401 });

        // تحديث كل إشعارات المستخدم غير المقروءة لتصبح مقروءة
        await db.notification.updateMany({
            where: {
                userId: user.id,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}