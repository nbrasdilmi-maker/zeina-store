import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { sendNotificationToUser } from "@/lib/notifications";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// --- 1. إرسال رسالة جديدة (آمنة تماماً) ---
export async function POST(request: NextRequest) {
  try {
    // التحقق من الهوية عبر verifyAuth (يدعم جلسات التجريبي)
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "غير مصرح: يرجى تسجيل الدخول" },
        { status: 401 },
      );
    }

    const authenticatedUserId = (user as any).id;
    const demoSessionId = (user as any)?.demoSessionId;

    const body = await request.json();
    const { conversationId, content, productImage, socketId } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "بيانات الرسالة ناقصة" },
        { status: 400 },
      );
    }

    // التحقق من أن المحادثة تنتمي لجلسة التجريبي الحالية
    const conversationCheck = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { demoSessionId: true, customerId: true, agentId: true },
    });

    if (!conversationCheck) {
      return NextResponse.json(
        { error: "المحادثة غير موجودة" },
        { status: 404 },
      );
    }

    if (demoSessionId && conversationCheck.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك بإرسال رسائل في هذه المحادثة" },
        { status: 403 },
      );
    }

    // إنشاء الرسالة باستخدام الـ ID الموثق من التوكن
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: authenticatedUserId,
        content,
        productImage,
        ...(demoSessionId ? { demoSessionId } : {}),
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // تحديث المحادثة وجلب أطرافها للإشعارات
    const conversation = await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
      include: {
        customer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    // ✅ تفعيل اللحظية عبر Pusher (معطل في وضع التجريبي)
    if (pusherServer) {
      if (socketId) {
        await pusherServer.trigger(conversationId, "new-message", message, {
          socket_id: socketId,
        });
      } else {
        await pusherServer.trigger(conversationId, "new-message", message);
      }
    }

    // تحديد المستلم لإرسال إشعار
    const recipientId =
      authenticatedUserId === conversation.customerId
        ? conversation.agentId || "ADMIN"
        : conversation.customerId;

    if (recipientId !== "ADMIN") {
      await sendNotificationToUser({
        userId: recipientId,
        type: "NEW_MESSAGE",
        title: `رسالة جديدة من ${message.sender.name}`,
        message:
          content.length > 50 ? content.substring(0, 50) + "..." : content,
        data: { conversationId, senderId: authenticatedUserId },
      });
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json(
      { error: "فشل في إرسال الرسالة" },
      { status: 500 },
    );
  }
}

// --- 2. جلب رسائل المحادثة (آمنة) ---
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "رقم المحادثة مطلوب" },
        { status: 400 },
      );
    }

    // التحقق من أن المحادثة تنتمي لجلسة التجريبي الحالية
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { demoSessionId: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "المحادثة غير موجودة" },
        { status: 404 },
      );
    }

    if (demoSessionId && conversation.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك برؤية رسائل هذه المحادثة" },
        { status: 403 },
      );
    }

    const messages = await db.message.findMany({
      where: {
        conversationId,
        ...(demoSessionId ? { demoSessionId } : {}),
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "فشل في جلب الرسائل" }, { status: 500 });
  }
}

// --- 3. حذف رسالة محددة (جديد) ---
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("id");

    if (!messageId) {
      return NextResponse.json({ error: "رقم الرسالة مطلوب" }, { status: 400 });
    }

    // جلب بيانات الرسالة للتحقق من المحادثة والجلسة
    const messageToDelete = await db.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, demoSessionId: true },
    });

    if (!messageToDelete) {
      return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
    }

    if (demoSessionId && messageToDelete.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك بحذف هذه الرسالة" },
        { status: 403 },
      );
    }

    // حذف الرسالة من قاعدة البيانات
    await db.message.delete({
      where: { id: messageId },
    });

    // إرسال تنبيه عبر Pusher للطرف الآخر (معطل في وضع التجريبي)
    if (messageToDelete && pusherServer) {
      await pusherServer.trigger(
        messageToDelete.conversationId,
        "message-deleted",
        {
          messageId,
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    return NextResponse.json(
      { error: "فشل الحذف في السيرفر" },
      { status: 500 },
    );
  }
}
