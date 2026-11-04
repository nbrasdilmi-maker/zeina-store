import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // 1. التحقق من هوية المستخدم وصلاحية الإدارة
    // const user = await verifyAuth(req);

    // if (!user || user.role !== "ADMIN") {
    //   return NextResponse.json(
    //     { success: false, error: "Unauthorized" },
    //     { status: 403 }
    //   );
    // }

      // --- 1. التحقق من الهوية والصلاحيات (مطور) ---
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    const isAdmin = user.role === "ADMIN";
    const isMerchant = user.role === "MERCHANT";
    const isAgent = user.role === "AGENT";

    // إذا كان مستخدماً عادياً (Customer)، نمنعه من الدخول
    if (!isAdmin && !isMerchant && !isAgent) {
      return NextResponse.json({ success: false, error: "ليس لديك صلاحية لعرض الإحصائيات" }, { status: 403 });
    }

    // --- 2. التجهيز الذكي للفلاتر (مهم جداً للتجار والمندوبين) ---
    let merchantId = null;
    const demoSessionId = (user as any)?.demoSessionId ?? null;
    const userFilter = { demoSessionId };
    
    // التاجر في قاعدة بياناتنا له جدول منفصل، يجب أن نجلب الـ id الخاص به أولاً
    if (isMerchant) {
      const merchantRecord = await db.merchant.findFirst({
        where: { userId: user.id, demoSessionId },
        select: { id: true }
      });
      if (merchantRecord) merchantId = merchantRecord.id;
    }

    // أ. فلتر المنتجات: الأدمن يرى الكل، التاجر يرى منتجاته بـ merchantId، المندوب بـ agentId
    let productFilter: any = { demoSessionId };
    if (isMerchant) productFilter = { merchantId: merchantId, demoSessionId };
    else if (isAgent) productFilter = { agentId: user.id, demoSessionId };

    // ب. فلتر الطلبات: الأدمن يرى الكل، التاجر يرى الطلبات التي تحتوي على منتجاته، المندوب يرى طلباته
    let orderFilter: any = { demoSessionId };
    if (isMerchant) {
      orderFilter = {
        demoSessionId,
        items: { some: { product: { merchantId: merchantId } } },
      };
    } else if (isAgent) {
      orderFilter = { agentId: user.id, demoSessionId };
    }

    // // 2. جلب الإحصائيات بشكل متسلسل (واحد تلو الآخر) لتجنب خنق الاتصال البطيء

    // // إحصائيات المستخدمين
    // const totalUsers = await db.user.count();
    // const totalCustomers = await db.user.count({ where: { role: "CUSTOMER" } });
    // const totalAgents = await db.user.count({ where: { role: "AGENT" } });

    // // إحصائيات المنتجات
    // const totalProducts = await db.product.count({ where: { isActive: true } });

    // // إحصائيات الطلبات
    // const totalOrders = await db.order.count();
    // const pendingOrders = await db.order.count({ where: { status: "PENDING" } });
    // const processingOrders = await db.order.count({ where: { status: "PROCESSING" } });
    // const completedOrders = await db.order.count({ where: { status: "DELIVERED" } });

    // // حساب إجمالي الإيرادات من الطلبات التي تم تسليمها فقط
    // const totalRevenueAggr = await db.order.aggregate({
    //   _sum: {
    //     totalAmount: true,
    //   },
    //   where: {
    //     status: "DELIVERED",
    //   },
    // });
    // const totalRevenue = totalRevenueAggr._sum.totalAmount || 0;

    // // جلب آخر 5 طلبات
    // const recentOrders = await db.order.findMany({
    //   take: 5,
    //   orderBy: {
    //     createdAt: "desc",
    //   },
    //   include: {
    //     customer: {
    //       select: { name: true, email: true },
    //     },
    //   },
    // });

    // // جلب آخر 5 مستخدمين مسجلين
    // const recentUsers = await db.user.findMany({
    //   take: 5,
    //   orderBy: {
    //     createdAt: "desc",
    //   },
    //   select: {
    //     id: true,
    //     name: true,
    //     email: true,
    //     role: true,
    //     createdAt: true,
    //   },
    // });

      // --- 3. جلب الإحصائيات بالتوازي مع تطبيق الفلاتر للصلاحيات ---
    const [
      totalUsers,
      totalCustomers,
      totalAgents,
      totalProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      totalRevenueAggr,
      recentOrders,
      recentUsers
    ] = await Promise.all([
      // أ. إحصائيات المستخدمين (للأدمن فقط، للتجار والمندوبين نرجع 0 لتجنب الأخطاء)
      isAdmin ? db.user.count({ where: userFilter }) : Promise.resolve(0),
      isAdmin ? db.user.count({ where: { ...userFilter, role: "CUSTOMER" } }) : Promise.resolve(0),
      isAdmin ? db.user.count({ where: { ...userFilter, role: "AGENT" } }) : Promise.resolve(0),

      // ب. إحصائيات المنتجات (مع دمج فلتر الصلاحيات)
      db.product.count({ where: { ...productFilter, isActive: true } }),

      // ج. إحصائيات الطلبات (مع دمج فلتر الصلاحيات)
      db.order.count({ where: orderFilter }),
      db.order.count({ where: { ...orderFilter, status: "PENDING" } }),
      db.order.count({ where: { ...orderFilter, status: "PROCESSING" } }),
      db.order.count({ where: { ...orderFilter, status: { in: ["DELIVERED", "COMPLETED"] } } }),

      // د. حساب الإيرادات (المعدل ليشمل المكتملة COMPLETED والمسلمة DELIVERED)
      db.order.aggregate({
        _sum: { totalAmount: true },
        where: { 
          ...orderFilter, 
          status: { in: ["DELIVERED", "COMPLETED"] } 
        },
      }),

      // هـ. آخر 5 طلبات (مع دمج فلتر الصلاحيات ونفس البيانات التي تتوقعها الواجهة)
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        where: orderFilter,
        include: {
          customer: { select: { name: true, email: true } },
        },
      }),

      // و. آخر 5 مستخدمين (للأدمن فقط)
      isAdmin ? db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        where: userFilter,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }) : Promise.resolve([])
    ]);

    const totalRevenue = totalRevenueAggr?._sum?.totalAmount || 0;

    // 3. إرسال النتيجة النهائية بتنسيق منظم
    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          agents: totalAgents,
        },
        products: totalProducts,
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          completed: completedOrders,
        },
        revenue: totalRevenue,
      },
      recentOrders,
      recentUsers,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء جلب الإحصائيات" },
      { status: 500 }
    );
  }
}