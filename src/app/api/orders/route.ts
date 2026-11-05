import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { pusherServer } from "@/lib/pusher";
import { verifyAuth } from "@/lib/auth";
import { encryptData, decryptData } from "@/lib/security";
import {
  sendNotificationToAdmins,
  sendNotificationToUser,
} from "@/lib/notifications";

// Validation schemas
const createOrderSchema = z.object({
  customerId: z.string().min(1, "معرف العميل مطلوب"),
  customerName: z.string().optional(),
  locationLink: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1).max(100),
        price: z.number().min(0),
        color: z.string().nullable().optional(),
      }),
    )
    .min(1, "يجب إضافة منتج واحد على الأقل"),
  notes: z.string().max(500).optional(),
  address: z.string().min(2, "العنوان قصير جداً").max(200),
  phone: z.string().min(6, "رقم الهاتف غير صحيح").max(20),
  governorate: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(["transfer", "wallet"]).optional(),
  paymentDetails: z
    .object({
      transferNumber: z.string().optional(),
      wallet: z.enum(["jeib", "kash", "jawali"]).optional(),
      proofImage: z.string().optional(),
    })
    .optional(),
});

const updateOrderSchema = z.object({
  orderId: z.string(),
  status: z
    .enum([
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  agentId: z.string().optional(),
  paymentDetails: z.any().optional(),
  paymentStatus: z.enum(["PENDING", "CONFIRMED", "REJECTED"]).optional(),
});

/**
 * Keep checkout working even when the cart still points at the public
 * catalog: a demo order must reference a product row owned by the same demo
 * session. Base products are cloned on demand, while products from another
 * demo session are rejected.
 */
async function resolveProductForSession(
  product: any,
  demoSessionId: string | null,
) {
  if (!demoSessionId) {
    return product.demoSessionId ? null : product;
  }

  if (product.demoSessionId === demoSessionId) {
    return product;
  }

  if (product.demoSessionId) {
    return null;
  }

  const existing = await db.product.findFirst({
    where: {
      demoSessionId,
      ...(product.sku
        ? { sku: product.sku }
        : { name: product.name, price: product.price }),
    },
  });

  if (existing) return existing;

  // Map the base category to the copy that belongs to this demo session.
  let categoryId: string | null = null;
  if (product.categoryId) {
    const baseCategory = await db.category.findUnique({
      where: { id: product.categoryId },
    });

    if (baseCategory) {
      const suffix = `-${demoSessionId.slice(-6)}`;
      const sessionSlug = baseCategory.slug.endsWith(suffix)
        ? baseCategory.slug
        : `${baseCategory.slug}${suffix}`;

      let clonedCategory = await db.category.findFirst({
        where: { demoSessionId, slug: sessionSlug },
        select: { id: true },
      });

      if (!clonedCategory) {
        clonedCategory = await db.category.create({
          data: {
            name: baseCategory.name,
            nameAr: baseCategory.nameAr,
            slug: sessionSlug,
            image: baseCategory.image,
            demoSessionId,
          },
          select: { id: true },
        });
      }

      categoryId = clonedCategory.id;
    }
  }

  return db.product.create({
    data: {
      name: product.name,
      nameAr: product.nameAr,
      description: product.description,
      descriptionAr: product.descriptionAr,
      price: product.price,
      originalPrice: product.originalPrice,
      images: product.images,
      mainImage: product.mainImage,
      stock: product.stock,
      sku: product.sku,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      colors: product.colors,
      sizes: product.sizes,
      videoUrl: product.videoUrl,
      featuresAr: product.featuresAr,
      usageAr: product.usageAr,
      ingredientsAr: product.ingredientsAr,
      inStock: product.inStock,
      estimatedDays: product.estimatedDays,
      costPrice: product.costPrice,
      categoryId,
      merchantId: null,
      agentId: null,
      demoSessionId,
    },
  });
}

// Get all orders
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    const demoSessionId = (authUser as any)?.demoSessionId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const agentId = searchParams.get("agentId");

    const where: Record<string, unknown> = {};

    // Filter by demo session for data isolation.
    // A demo ADMIN oversees every demo session (so a customer order shows up
    // in the admin's order-management tab after switching roles), while every
    // other role only sees its own session. Base (non-demo) admins keep
    // seeing only base orders.
    const isDemoAdmin =
      authUser?.role === "ADMIN" && Boolean(demoSessionId);

    if (isDemoAdmin) {
      where.demoSessionId = { not: null };
    } else {
      where.demoSessionId = demoSessionId ?? null;
    }

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (agentId) where.agentId = agentId;

    const orders = await db.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                mainImage: true,
                price: true,
                sku: true,
                merchant: {
                  select: { storeName: true },
                },
                agent: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // فك تشفير paymentDetails لكل طلب
    const decryptedOrders = orders.map((order) => ({
      ...order,
      paymentDetails: order.paymentDetails
        ? decryptData(order.paymentDetails)
        : null,
    }));

    return NextResponse.json({ orders: decryptedOrders });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الطلبات" },
      { status: 500 },
    );
  }
}

// Create order (secure)
export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;

    const body = await request.json();
    console.log(
      "البيانات التي وصلت للسيرفر هي:",
      JSON.stringify(body, null, 2),
    );

    // Validate input
    const validatedData = createOrderSchema.parse(body);

    // Verify customer exists and belongs to demo session
    const customer = await db.user.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    // Verify customer belongs to the same demo session
    if ((customer.demoSessionId ?? null) !== (demoSessionId ?? null)) {
      return NextResponse.json(
        { error: "العميل غير تابع لجلستك التجريبية" },
        { status: 403 },
      );
    }

    // Verify all products and calculate total
    let totalAmount = 0;
    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
      color?: string | null;
    }> = [];

    for (const item of validatedData.items) {
      const sourceProduct = await db.product.findUnique({
        where: { id: item.productId },
      });

      if (!sourceProduct) {
        return NextResponse.json(
          {
            error: `المنتج غير موجود: ${item.productId}`,
          },
          { status: 404 },
        );
      }

      const product = await resolveProductForSession(
        sourceProduct,
        demoSessionId ?? null,
      );

      if (!product) {
        return NextResponse.json(
          {
            error: `المنتج غير متاح في جلستك الحالية: ${sourceProduct.nameAr}. يرجى تحديث السلة ثم المحاولة مرة أخرى.`,
          },
          { status: 400 },
        );
      }

      if (!product.isActive) {
        return NextResponse.json(
          {
            error: `المنتج غير متوفر: ${product.nameAr}`,
          },
          { status: 400 },
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `الكمية المطلوبة غير متوفرة من: ${product.nameAr}`,
          },
          { status: 400 },
        );
      }

      // Use product price from database (security)
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        color: item.color,
      });
    }

    // تجميع بيانات المستلم والموقع داخل حقل الدفع
    const enrichedPaymentDetails = {
      ...(validatedData.paymentDetails || {}),
      customerName: validatedData.customerName,
      locationLink: validatedData.locationLink,
    };

    // Create order with transaction
    const order = await db.$transaction(
      async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            customerId: validatedData.customerId,
            demoSessionId,
            totalAmount: validatedData.totalAmount || totalAmount,
            notes: validatedData.notes,
            address: validatedData.address,
            phone: validatedData.phone,
            governorate: validatedData.governorate,
            paymentMethod: validatedData.paymentMethod || null,
            paymentDetails: encryptData(JSON.stringify(enrichedPaymentDetails)),
            items: {
              create: orderItems,
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    mainImage: true,
                  },
                },
              },
            },
          },
        });

        // Update product stock
        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        return newOrder;
      },
      {
        maxWait: 5000,
        timeout: 20000,
      },
    );

    // Log security event
    console.log(
      `[ORDER] Created: ${order.id} by customer: ${validatedData.customerId} - Total: ${totalAmount}`,
    );

    // 1. إشعار لكل المدراء بوجود طلب جديد
    await sendNotificationToAdmins({
      type: "ORDER_NEW",
      title: "طلب جديد! 🛍️",
      message: `تم استلام طلب جديد بقيمة ${totalAmount.toLocaleString()} ر.ي من العميل: ${customer.name}`,
      data: { orderId: order.id },
      demoSessionId,
    });

    // 2. إشعار للعميل لتأكيد استلام الطلب
    await sendNotificationToUser({
      userId: customer.id,
      type: "ORDER_NEW",
      title: "تم استلام طلبك بنجاح 🎉",
      message: `رقم طلبك هو #${order.id.slice(-8)}. جاري مراجعته وتجهيزه، شكراً لتسوقك من زينة.`,
      data: { orderId: order.id },
      demoSessionId,
    });

    return NextResponse.json({
      success: true,
      order,
      message: "تم إنشاء الطلب بنجاح",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues?.[0]?.message || "خطأ في البيانات المرسلة" },
        { status: 400 },
      );
    }
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "تعذر الاتصال بقاعدة البيانات حالياً، يرجى المحاولة مرة أخرى" },
      { status: 500 },
    );
  }
}

// Update order status & Claiming Logic with Advanced Notifications
// Update order status & Claiming Logic with Advanced Notifications + Accounting Sync
export async function PUT(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;
    const confirmedBy = authUser?.id;

    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);

    // جلب الطلب الحالي للتحقق من الملكية والدفع
    const existingOrder = await db.order.findUnique({
      where: { id: validatedData.orderId },
      select: { paymentStatus: true, demoSessionId: true, customerId: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    // A demo ADMIN can manage any demo order (from any customer session).
    // Every other role is restricted to orders from its own demo session.
    const isAdmin = authUser.role === "ADMIN";
    const orderSessionId = existingOrder.demoSessionId ?? null;
    const canManageOrder = isAdmin
      ? demoSessionId
        ? existingOrder.demoSessionId !== null
        : existingOrder.demoSessionId === null
      : orderSessionId === (demoSessionId ?? null);

    if (!canManageOrder) {
      return NextResponse.json(
        { error: "غير مسموح لك بتعديل هذا الطلب" },
        { status: 403 },
      );
    }

    const updateData: any = {};
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.agentId) updateData.agentId = validatedData.agentId;
    if (validatedData.paymentDetails) {
      updateData.paymentDetails = encryptData(
        JSON.stringify(validatedData.paymentDetails),
      );
    }
    if (validatedData.paymentStatus) {
      updateData.paymentStatus = validatedData.paymentStatus;
    }

    const wasPending = existingOrder?.paymentStatus === "PENDING";
    const isConfirming =
      validatedData.paymentStatus === "CONFIRMED" && wasPending;
    const isRejecting =
      validatedData.paymentStatus === "REJECTED" && wasPending;

    // تنفيذ التحديث داخل transaction لتسجيل الحركات المالية
    const order = await db.$transaction(async (tx) => {
      // 1. تحديث الطلب
      const updated = await tx.order.update({
        where: { id: validatedData.orderId },
        data: {
          ...updateData,
          // Keep the order in the customer's session; an admin acting from a
          // different demo session must not move it.
          demoSessionId: orderSessionId,
          ...(isConfirming || isRejecting
            ? {
                paymentConfirmedBy: confirmedBy,
                paymentConfirmedAt: new Date(),
              }
            : {}),
        },
        include: {
          customer: true,
          agent: true,
          items: {
            include: {
              product: {
                include: {
                  merchant: { include: { user: true } },
                  agent: true,
                },
              },
            },
          },
        },
      });

      // 2. إذا تم تأكيد الدفع: تسجيل حركة مالية وتحديث مبيعات التاجر
      if (isConfirming) {
        await tx.transaction.create({
          data: {
            referenceNumber: updated.id.slice(-8),
            type: "SALE",
            amount: updated.totalAmount,
            description: `بيع منتجات - طلب #${updated.id.slice(-8)}`,
            orderId: updated.id,
            demoSessionId: orderSessionId,
          },
        });

        // تحديث مبيعات التاجر
        for (const item of updated.items) {
          const product = item.product;
          if (product.merchantId) {
            const merchant = await tx.merchant.findUnique({
              where: { id: product.merchantId },
            });
            if (merchant) {
              const itemTotal = item.price * item.quantity;
              const commission = itemTotal * (merchant.commissionAmount / 100);
              await tx.merchant.update({
                where: { id: merchant.id },
                data: {
                  totalSales: { increment: itemTotal },
                  totalCommission: { increment: commission },
                },
              });
            }
          }
        }

        // إشعار للعميل بتأكيد الدفع
        await sendNotificationToUser({
          userId: updated.customerId,
          type: "PAYMENT_CONFIRMED",
          title: "تم تأكيد الدفع ✅",
          message: `تم تأكيد استلام دفعتك للطلب #${updated.id.slice(-8)}. جاري تجهيز طلبك.`,
          data: { orderId: updated.id },
          demoSessionId: orderSessionId,
        });
      }

      // 3. إذا تم رفض الدفع
      if (isRejecting) {
        await sendNotificationToUser({
          userId: updated.customerId,
          type: "PAYMENT_REJECTED",
          title: "تنبيه بخصوص الدفع ⚠️",
          message: `عذراً، تم رفض إثبات الدفع للطلب #${updated.id.slice(-8)}. يرجى التواصل مع الإدارة.`,
          data: { orderId: updated.id },
          demoSessionId: orderSessionId,
        });
      }

      return updated;
    });

    const orderCode = order.id.slice(-8);
    const orderDetails = `📦 طلب #${orderCode}\n💰 المبلغ: ${order.totalAmount} ر.ي\n📍 العنوان: ${order.governorate} - ${order.address}\n📞 هاتف: ${order.phone}`;
    const statusAr =
      {
        PENDING: "قيد الانتظار",
        PROCESSING: "قيد التجهيز",
        SHIPPED: "تم الشحن",
        DELIVERED: "تم التسليم",
        COMPLETED: "منجز",
        CANCELLED: "ملغي",
      }[order.status] || order.status;

    // --- 1. إشعار للإدارة (تفصيلي جداً) ---
    await sendNotificationToAdmins({
      type: "ORDER_CLAIMED",
      title: "تحديث حالة طلبية 📢",
      message: `قام المندوب [${order.agent?.name || "الإدارة"}] بتغيير حالة الطلبية #${orderCode} إلى (${statusAr}).\n${orderDetails}`,
      data: { orderId: order.id },
      demoSessionId,
    });

    // --- 2. إشعارات لأصحاب المنتجات (تجار أو مناديب) ---
    const ownersNotified = new Set();

    for (const item of order.items) {
      const product = item.product;
      const owner = product.merchant?.user || product.agent;

      if (owner && !ownersNotified.has(owner.id)) {
        await sendNotificationToUser({
          userId: owner.id,
          type: "ORDER_CLAIMED",
          title: "تحديث على منتجاتك 🔔",
          message: `قام [${order.agent?.name || "الإدارة"}] باستلام/تحديث طلبيتك #${orderCode}.\nالحالة: ${statusAr}\nالمنتج: ${product.nameAr}\n${orderDetails}`,
          data: { orderId: order.id },
          demoSessionId: orderSessionId,
        });
        ownersNotified.add(owner.id);
      }
    }

    // --- 3. إشعار للعميل (الشفافية والدردشة) ---
    if (validatedData.status === "PROCESSING") {
      const claimerName = order.agent?.name || "الإدارة";
      await sendNotificationToUser({
        userId: order.customerId,
        type: "ORDER_CONFIRMED",
        title: "بدأ تجهيز طلبك 🚀",
        message: `المندوب [${claimerName}] استلم طلبك #${orderCode} وهو الآن قيد التجهيز.\nيمكنك التواصل معه مباشرة عبر الدردشة للاستفسار.`,
        data: { orderId: order.id, agentId: order.agentId },
        demoSessionId: orderSessionId,
      });
    } else if (validatedData.status) {
      const messages: any = {
        SHIPPED: "طلبك في الطريق إليك الآن! 🚚",
        DELIVERED: "تم تسليم الطلب بنجاح. نتمنى أن ينال إعجابك! ✅",
        CANCELLED: "عذراً، تم إلغاء طلبك. يرجى مراجعة الإدارة. ⚠️",
      };
      if (messages[validatedData.status]) {
        await sendNotificationToUser({
          userId: order.customerId,
          type: "ORDER_NEW",
          title: "تحديث حالة الطلب",
          message: `${messages[validatedData.status]}\nكود الطلب: #${orderCode}`,
          data: { orderId: order.id },
          demoSessionId: orderSessionId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      order,
      message: "تم تحديث الطلب وإرسال الإشعارات",
    });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الطلب" },
      { status: 500 },
    );
  }
}
