import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { z } from "zod";

const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["MERCHANT", "AGENT", "ADMIN"]).optional(),
  commission: z.number().min(0).max(100).optional(),
  contactInfo: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/accounting/suppliers/[id] - تحديث بيانات مورد
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSupplierSchema.parse(body);

    const demoSessionId = (user as any)?.demoSessionId;

    // التحقق من وجود المورد وأنه ينتمي لجلسة التجريبي الحالية
    const existing = await db.supplier.findUnique({
      where: {
        id,
        ...(demoSessionId ? { demoSessionId } : {}),
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "المورد غير موجود أو لا ينتمي لجلستك التجريبية" },
        { status: 404 },
      );
    }

    // تحديث المورد مع عزل الجلسة التجريبية
    const updated = await db.supplier.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.type && { type: validated.type }),
        ...(validated.commission !== undefined && {
          commission: validated.commission,
        }),
        ...(validated.contactInfo !== undefined && {
          contactInfo: validated.contactInfo,
        }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
        ...(demoSessionId ? { demoSessionId } : {}),
      },
    });

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    console.error("Update supplier error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المورد" },
      { status: 500 },
    );
  }
}
