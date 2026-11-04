import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

// Get all categories - filtered by demo session
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    const demoSessionId = (authUser as any)?.demoSessionId;

    const where: Record<string, unknown> = {};

    // Filter by demo session for data isolation
    if (demoSessionId) {
      where.demoSessionId = demoSessionId;
    }

    const categories = await db.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        nameAr: "asc",
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    
    // Return default categories if database error
    return NextResponse.json({
      categories: [
        { id: "perfumes", name: "Perfumes", nameAr: "عطور", slug: "perfumes", _count: { products: 0 } },
        { id: "makeup", name: "Makeup", nameAr: "مكياج", slug: "makeup", _count: { products: 0 } },
        { id: "accessories", name: "Accessories", nameAr: "أكسسوارات", slug: "accessories", _count: { products: 0 } },
        { id: "skincare", name: "Skincare", nameAr: "عناية", slug: "skincare", _count: { products: 0 } },
      ],
    });
  }
}

// Create category - requires demo session
export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;

    const body = await request.json();
    const { name, nameAr, slug, image } = body;

    const category = await db.category.create({
      data: {
        name,
        nameAr,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        image,
        demoSessionId,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء التصنيف" },
      { status: 500 }
    );
  }
}

// Update category - requires demo session and ownership
export async function PUT(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;

    const body = await request.json();
    const { id, ...data } = body;

    // Verify category belongs to this demo session
    const existing = await db.category.findUnique({
      where: { id },
      select: { demoSessionId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
    }

    if (demoSessionId && existing.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك بتعديل هذا التصنيف" },
        { status: 403 },
      );
    }

    const category = await db.category.update({
      where: { id },
      data: { ...data, demoSessionId },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث التصنيف" },
      { status: 500 }
    );
  }
}

// Delete category - requires demo session and ownership
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { error: "معرف التصنيف مطلوب" },
        { status: 400 }
      );
    }

    // Verify category belongs to this demo session
    const existing = await db.category.findUnique({
      where: { id: categoryId },
      select: { demoSessionId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
    }

    if (demoSessionId && existing.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك بحذف هذا التصنيف" },
        { status: 403 },
      );
    }

    await db.category.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف التصنيف" },
      { status: 500 }
    );
  }
}
