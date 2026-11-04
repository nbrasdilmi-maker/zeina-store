import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { sendNotificationToUser } from "@/lib/notifications"; // 👈 استدعاء نظام الإشعارات الرسمي

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. التفتيش الأمني (التحقق من الهوية عبر verifyAuth لدعم جلسات التجريبي)
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
    const { productId, agentId } = body;

    console.log(
      "📝 [Conversation API] - authenticatedUserId:",
      authenticatedUserId,
    );
    console.log("📝 [Conversation API] - received agentId:", agentId);
    console.log("📝 [Conversation API] - received productId:", productId);

    // 2. البحث عن محادثة قائمة (مع عزل الجلسة التجريبية)
    const searchCondition = agentId
      ? {
          OR: [
            { customerId: authenticatedUserId, agentId: agentId },
            { customerId: agentId, agentId: authenticatedUserId },
          ],
        }
      : { customerId: authenticatedUserId, agentId: null };

    let conversation = await db.conversation.findFirst({
      where: {
        status: "ACTIVE",
        ...searchCondition,
        ...(demoSessionId ? { demoSessionId } : {}),
      },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 20 },
        agent: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    console.log(
      "📝 [Conversation API] - existing conversation found:",
      conversation?.id || "none",
    );

    // إذا كانت محادثة جديدة تماماً
    if (!conversation) {
      console.log(
        "📝 [Conversation API] - Creating new conversation with agentId:",
        agentId,
      );

      conversation = await db.conversation.create({
        data: {
          customerId: authenticatedUserId,
          agentId: agentId,
          status: "ACTIVE",
          ...(demoSessionId ? { demoSessionId } : {}),
        },
        include: {
          messages: true,
          agent: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      });

      console.log(
        "📝 [Conversation API] - New conversation created with ID:",
        conversation.id,
      );

      // 🔔 إشعار "محادثة جديدة" للموظف (يعمل في الخلفية لسرعة الرد)
      const targetNotifyId = agentId || "ADMIN";
      sendNotificationToUser({
        userId: targetNotifyId,
        type: "NEW_MESSAGE",
        title: "محادثة جديدة 💬",
        message: `العميل ${conversation.customer.name} بدأ محادثة معك الآن`,
        data: { conversationId: conversation.id },
      }).catch(console.error);
    }

    // 3. معالجة الاستفسار عن المنتج (الرسالة الآلية)
    if (productId) {
      console.log(
        "📝 [Conversation API] - Processing product inquiry for productId:",
        productId,
      );

      const product = await db.product.findUnique({ where: { id: productId } });

      if (product) {
        console.log("📝 [Conversation API] - Product found:", product.nameAr);

        const lastMsg = await db.message.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
        });

        if (!lastMsg || !lastMsg.content.includes(product.nameAr)) {
          console.log(
            "📝 [Conversation API] - Creating auto message for product",
          );

          const autoMessage = await db.message.create({
            data: {
              conversationId: conversation.id,
              senderId: authenticatedUserId,
              content: `استفسار بخصوص المنتج: ${product.nameAr}`,
              productImage: product.mainImage,
              ...(demoSessionId ? { demoSessionId } : {}),
            },
            include: {
              sender: { select: { id: true, name: true, role: true } },
            },
          });

          // 🔔 إرسال إشعار للموظف يخبره عن المنتج المستهدف
          const targetNotifyId = agentId || "ADMIN";
          sendNotificationToUser({
            userId: targetNotifyId,
            type: "NEW_MESSAGE",
            title: `استفسار عن: ${product.nameAr}`,
            message: `العميل ${conversation.customer.name} يستفسر عن منتجك`,
            data: { conversationId: conversation.id, productId },
          }).catch(console.error);

          conversation.messages.push(autoMessage as any);
        }
      }
    }

    // 4. الرد النهائي الفوري
    console.log(
      "📝 [Conversation API] - Returning conversation with ID:",
      conversation.id,
    );
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("❌ [Conversation API] Error:", error);
    return NextResponse.json({ error: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. التحقق من الهوية عبر verifyAuth
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    // 2. جلب رقم المحادثة المراد حذفها من الرابط
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("id");

    if (!conversationId) {
      return NextResponse.json(
        { error: "رقم المحادثة مطلوب" },
        { status: 400 },
      );
    }

    // 3. التحقق من أن المحادثة تنتمي لجلسة التجريبي الحالية
    const existing = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { demoSessionId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "المحادثة غير موجودة" },
        { status: 404 },
      );
    }

    if (demoSessionId && existing.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك بحذف هذه المحادثة" },
        { status: 403 },
      );
    }

    // 4. التنظيف الشامل: حذف كل الرسائل المرتبطة أولاً، ثم حذف المحادثة
    await db.$transaction([
      db.message.deleteMany({ where: { conversationId } }),
      db.conversation.delete({ where: { id: conversationId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [Conversation API] Error deleting conversation:", error);
    return NextResponse.json(
      { error: "فشل حذف المحادثة في السيرفر" },
      { status: 500 },
    );
  }
}
