import { db } from "./db";
import { NotificationType } from "@prisma/client";

// دالة مساعدة لإرسال إشعار ويب داشبورد (بدون Pusher في وضع التجريبي)
// يتم تخزين الإشعار في قاعدة البيانات ويمكن جلبه عبر API
async function triggerWebPush(userId: string, title: string, message: string) {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    // In demo mode, we skip actual web push to avoid external dependencies
    // The notification is stored in DB and can be polled via GET /api/notifications
    console.log(`[Demo Notification] Would send web push to ${userId}: ${title} - ${message}`);
  } catch (err) {
    console.error("⚠️ فشل إرسال الإشعار:", err);
  }
}

export async function sendNotificationToUser({
  userId,
  type,
  title,
  message,
  data,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}) {
  try {
    // 1. حفظ الإشعار في قاعدة البيانات
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });

    // 2. في وضع التجريبي، لا نستخدم Pusher. الإشعار يُخزن في DB ويُجلب عبر API.
    //await triggerWebPush(userId, title, message);

    return notification;
  } catch (error) {
    console.error("❌ خطأ في إرسال الإشعار للمستخدم:", error);
    return null;
  }
}

export async function sendNotificationToAdmins({
  type,
  title,
  message,
  data,
}: {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}) {
  try {
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length === 0) return;

    const promises = admins.map((admin) =>
      sendNotificationToUser({
        userId: admin.id,
        type,
        title,
        message,
        data,
      }),
    );

    await Promise.all(promises);
  } catch (error) {
    console.error("❌ خطأ في إرسال الإشعارات للإدارة:", error);
  }
}
