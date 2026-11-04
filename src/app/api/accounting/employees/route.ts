import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/accounting/employees - جلب جميع المستخدمين (إدارة، مناديب، تجار)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const demoSessionId = (user as any)?.demoSessionId;

    // جلب جميع المستخدمين الذين لديهم دور ADMIN, AGENT, MERCHANT (معزولة حسب الجلسة التجريبية)
    const users = await db.user.findMany({
      where: {
        role: { in: ["ADMIN", "AGENT", "MERCHANT"] },
        ...(demoSessionId ? { demoSessionId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        permissions: true, // JSON string
        createdAt: true,
        merchant: {
          select: {
            id: true,
            storeName: true,
            commissionAmount: true,
            totalSales: true,
          },
        },
        products: {
          select: { id: true },
        },
        agentOrders: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // إضافة حقول محسوبة
    const enrichedUsers = users.map((u) => {
      let permissions: string[] = [];
      try {
        permissions = u.permissions ? JSON.parse(u.permissions) : [];
      } catch (e) {}

      return {
        ...u,
        permissions,
        stats: {
          productsCount: u.products.length,
          ordersCount: u.agentOrders.length,
          totalSales: u.merchant?.totalSales || 0,
        },
      };
    });

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error("Employees API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الموظفين" },
      { status: 500 },
    );
  }
}

// PUT /api/accounting/employees - تحديث صلاحيات مستخدم (ترقية للنظام المحاسبي)
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAuth(request);
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, grantAccountingAccess } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "معرف المستخدم مطلوب" },
        { status: 400 },
      );
    }

    const demoSessionId = (user as any)?.demoSessionId;

    const targetUser = await db.user.findUnique({
      where: {
        id: userId,
        ...(demoSessionId ? { demoSessionId } : {}),
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "المستخدم غير موجود أو لا ينتمي لجلستك التجريبية" },
        { status: 404 },
      );
    }

    // قراءة الصلاحيات الحالية
    let currentPermissions: string[] = [];
    try {
      currentPermissions = targetUser.permissions
        ? JSON.parse(targetUser.permissions)
        : [];
    } catch (e) {}

    // قائمة الصلاحيات الكاملة للنظام المحاسبي
    const accountingPermissions = [
      "view_dashboard",
      "view_journal",
      "create_journal",
      "view_orders",
      "manage_orders",
      "view_cashflow",
      "manage_cashflow",
      "view_inventory",
      "manage_inventory",
      "view_suppliers",
      "manage_suppliers",
      "view_returns",
      "manage_returns",
      "view_employees",
      "manage_employees",
    ];

    let newPermissions: string[];
    if (grantAccountingAccess) {
      // إضافة الصلاحيات إذا لم تكن موجودة
      newPermissions = [
        ...new Set([...currentPermissions, ...accountingPermissions]),
      ];
    } else {
      // إزالة الصلاحيات المحاسبية
      newPermissions = currentPermissions.filter(
        (p) => !accountingPermissions.includes(p as any),
      );
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        permissions: JSON.stringify(newPermissions),
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: grantAccountingAccess
        ? "تم منح صلاحية النظام المحاسبي"
        : "تم سحب صلاحية النظام المحاسبي",
    });
  } catch (error) {
    console.error("Update employee permissions error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الصلاحيات" },
      { status: 500 },
    );
  }
}
