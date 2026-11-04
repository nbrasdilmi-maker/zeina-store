import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        // التحقق من الهوية عبر verifyAuth (يدعم جلسات التجريبي)
        const user = await verifyAuth(request);
        if (!user || !user.id) {
            return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
        }

        const userId = (user as any).id;
        const userRole = (user as any).role;
        const demoSessionId = (user as any)?.demoSessionId;

        // بناء شرط البحث بناءً على رتبة المستخدم والجلسة التجريبية
        let whereClause: any = {};

        // عزل البيانات حسب الجلسة التجريبية
        if (demoSessionId) {
            whereClause.demoSessionId = demoSessionId;
        }

        if (userRole === "ADMIN") {
            // الإدارة ترى جميع المحادثات في جلستها التجريبية فقط
            console.log("📝 [Inbox API] - ADMIN mode: fetching conversations for demo session", demoSessionId);
        } else if (userRole === "AGENT" || userRole === "MERCHANT") {
            // المندوب أو التاجر يرى المحادثات التي هو الوكيل فيها فقط
            whereClause = {
                ...whereClause,
                agentId: userId
            };
            console.log("📝 [Inbox API] - AGENT/MERCHANT mode: fetching conversations where agentId =", userId);
        } else {
            // العميل يرى المحادثات التي هو العميل فيها فقط
            whereClause = {
                ...whereClause,
                customerId: userId
            };
            console.log("📝 [Inbox API] - CUSTOMER mode: fetching conversations where customerId =", userId);
        }

        // جلب المحادثات مع بيانات الطرفين
        const conversations = await db.conversation.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    }
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    }
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                }
            },
            orderBy: { updatedAt: "desc" },
        });

        console.log("📝 [Inbox API] - Found conversations count:", conversations.length);

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("❌ [Inbox API] Error fetching inbox:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
