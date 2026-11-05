import { NextRequest, NextResponse } from "next/server";
import {
  cleanupExpiredDemoSessions,
  createDemoSession,
  deleteDemoSessionData,
} from "@/lib/demo-session";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_ROLES: UserRole[] = ["ADMIN", "MERCHANT", "AGENT", "CUSTOMER"];

/**
 * POST /api/demo/session
 * Create a new demo session for the selected role.
 * `{ guest: true, name, phone }` creates a temporary customer identity so a
 * visitor can check out without registering.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const isGuest = body?.guest === true;
    const role = isGuest ? "CUSTOMER" : body?.role;
    const name =
      typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
    const phone =
      typeof body?.phone === "string"
        ? body.phone.trim().slice(0, 20)
        : "";

    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: "الدور غير صالح. الأدوار المتاحة: ADMIN, MERCHANT, AGENT, CUSTOMER" },
        { status: 400 }
      );
    }

    if (isGuest && name.length < 2) {
      return NextResponse.json(
        { error: "يرجى كتابة الاسم الكامل لإتمام الطلب كزائر" },
        { status: 400 }
      );
    }

    if (isGuest && phone.length < 6) {
      return NextResponse.json(
        { error: "يرجى كتابة رقم هاتف صحيح لإتمام الطلب كزائر" },
        { status: 400 }
      );
    }

    // Best-effort, bounded cleanup. Never delay the new session for it.
    void cleanupExpiredDemoSessions(2);

    const demoSession = await createDemoSession(role as UserRole, {
      guest: isGuest,
      name,
      phone,
    });

    return NextResponse.json({
      success: true,
      message: isGuest
        ? "تم إنشاء جلسة ضيف مؤقتة"
        : "تم إنشاء جلسة التجريبي بنجاح",
      sessionId: demoSession.sessionId,
      role: demoSession.role,
      userId: demoSession.userId,
      token: demoSession.token,
      refreshToken: demoSession.refreshToken,
      expiresAt: demoSession.expiresAt,
      user: demoSession.user,
    });
  } catch (error) {
    console.error("Create demo session error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء جلسة التجريبي" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/demo/session
 * Check if a demo session exists (by token in Authorization header).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ hasSession: false }, { status: 200 });
    }

    const token = authHeader.split(" ")[1];
    const { db } = await import("@/lib/db");
    const { verifyToken } = await import("@/lib/security");

    const result = verifyToken(token);
    if (!result.valid || !result.payload) {
      return NextResponse.json({ hasSession: false }, { status: 200 });
    }

    const payload = result.payload as any;
    if (!payload.isDemo || !payload.sessionId) {
      return NextResponse.json({ hasSession: false }, { status: 200 });
    }

    const demoSession = await db.demoSession.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, role: true, expiresAt: true },
    });

    if (!demoSession || demoSession.expiresAt < new Date()) {
      return NextResponse.json({ hasSession: false }, { status: 200 });
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        hasSession: true,
        sessionId: demoSession.id,
        userId: payload.userId,
        role: demoSession.role,
        user: user
          ? {
              ...user,
              isVerified: true,
              isGuest: user.email.startsWith("guest-"),
            }
          : undefined,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ hasSession: false }, { status: 200 });
  }
}

/**
 * DELETE /api/demo/session
 * End the current demo session.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "لا توجد جلسة نشطة" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { verifyToken } = await import("@/lib/security");

    const result = verifyToken(token);
    if (result.valid && result.payload) {
      const payload = result.payload as any;
      if (payload.isDemo && payload.sessionId) {
        // Delete all data associated with this demo session
        await deleteDemoSessionData(payload.sessionId);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم إنهاء جلسة التجريبي",
    });
  } catch (error) {
    console.error("Delete demo session error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنهاء الجلسة" },
      { status: 500 }
    );
  }
}
