import { NextRequest, NextResponse } from "next/server";
import { createDemoSession, deleteDemoSessionData } from "@/lib/demo-session";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_ROLES: UserRole[] = ["ADMIN", "MERCHANT", "AGENT", "CUSTOMER"];

/**
 * POST /api/demo/session
 * Create a new demo session for the selected role.
 * Returns a secure JWT token and session data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: "الدور غير صالح. الأدوار المتاحة: ADMIN, MERCHANT, AGENT, CUSTOMER" },
        { status: 400 }
      );
    }

    const demoSession = await createDemoSession(role as UserRole);

    return NextResponse.json({
      success: true,
      message: "تم إنشاء جلسة التجريبي بنجاح",
      sessionId: demoSession.sessionId,
      role: demoSession.role,
      userId: demoSession.userId,
      token: demoSession.token,
      refreshToken: demoSession.refreshToken,
      expiresAt: demoSession.expiresAt,
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
    if (!payload.isDemo) {
      return NextResponse.json({ hasSession: false }, { status: 200 });
    }

    return NextResponse.json({
      hasSession: true,
      sessionId: payload.sessionId,
      userId: payload.userId,
      role: payload.role,
    }, { status: 200 });
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
