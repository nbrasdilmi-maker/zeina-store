import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { verifyToken } from "@/lib/security";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  userId: z.string(),
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  address: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "AGENT", "MERCHANT", "CUSTOMER"]).optional(),
});

/**
 * Get all users - PROTECTED (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'غير مصرح بالوصول' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = verifyToken(token);

    if (!verification.valid || verification.payload?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'هذه الميزة متاحة للمسؤول فقط' },
        { status: 403 }
      );
    }

    const payload = verification.payload as any;
    const demoSessionId = payload.isDemo ? payload.sessionId : null;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // غيرنا النوع إلى any عشان يقبل الفلتر المتقدم
    const where: any = { demoSessionId }; 
    
    if (role) {
      where.role = role;
    } else {
      // --- إضافة سحرية: إذا الإدارة طلبت كل المستخدمين، نستثني الزوار (GUEST) ---
      where.role = { not: "GUEST" };
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            orders: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب المستخدمين" },
      { status: 500 }
    );
  }
}

/**
 * Update user - PROTECTED
 * Admin can update any user
 * Users can only update their own profile (name, phone, address)
 */
export async function PUT(request: NextRequest) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'غير مصرح بالوصول' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = verifyToken(token);

    if (!verification.valid) {
      return NextResponse.json(
        { error: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);
    const { userId, ...data } = validated;

    const payload = verification.payload as any;
    const demoSessionId = payload.isDemo ? payload.sessionId : null;

    // Never allow one demo session to edit a user from another session.
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { demoSessionId: true },
    });

    if (!targetUser || (targetUser.demoSessionId ?? null) !== demoSessionId) {
      return NextResponse.json(
        { error: 'غير مسموح لك بتعديل هذا المستخدم' },
        { status: 403 }
      );
    }

    // Check permissions
    const isAdmin = verification.payload?.role === 'ADMIN';
    const isSelf = verification.payload?.userId === userId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'يمكنك تعديل بياناتك فقط' },
        { status: 403 }
      );
    }

    // Non-admin users can only update name, phone, address
    if (!isAdmin) {
      delete data.isActive;
      delete data.role;
    }

    const user = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المستخدم" },
      { status: 500 }
    );
  }
}
