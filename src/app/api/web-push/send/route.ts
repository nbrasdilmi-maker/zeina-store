import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // In demo mode, web push is disabled. No VAPID keys are configured.
    // Notifications are stored in DB and can be polled via GET /api/notifications.
    const body = await request.json();
    const { title, message, url } = body;

    console.log("[Demo Web Push] Simulated push notification:", {
      title: title || "زينة ✨",
      message: message || "اكتشف أحدث العروض والمنتجات الفاخرة!",
      url: url || "/",
    });

    return NextResponse.json(
      {
        message: "✅ تم محاكاة إرسال الإشعار (وضع التجريبي - لا يتم إرسال إشعارات فعلية)",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ [API Error] خطأ عام في محطة البث:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء محاولة إرسال الإشعارات." },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
