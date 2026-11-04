import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { sendNotificationToAdmins } from "@/lib/notifications";
import { verifyAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/products/[id] - تحديث منتج
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;

    const { id } = await params;
    const body = await request.json();

    // التحقق من وجود المنتج وأنه ينتمي لجلسة التجريبي الحالية
    const existingProduct = await db.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    if (demoSessionId && existingProduct.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك بتعديل هذا المنتج" },
        { status: 403 },
      );
    }
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      price,
      originalPrice,
      mainImage,
      images,
      stock,
      categoryId,
      agentId,
      isFeatured,
      colors,
      sizes,
      videoUrl,
      featuresAr,
      usageAr,
      ingredientsAr,
      inStock,
      estimatedDays,
    } = body;

    // منطق تحديث المورد (Supplier) إذا تغير agentId
    let supplierId: string | null = existingProduct.supplierId;
    if (agentId && agentId !== existingProduct.agentId) {
      const user = await db.user.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, role: true },
      });

      if (
        user &&
        (user.role === "AGENT" ||
          user.role === "ADMIN" ||
          user.role === "MERCHANT")
      ) {
        let supplier = await db.supplier.findUnique({
          where: { userId: agentId },
        });

        if (!supplier) {
          supplier = await db.supplier.create({
            data: {
              userId: agentId,
              name: user.name,
              type: user.role as any,
              commission: null,
            },
          });
        }
        supplierId = supplier.id;
      }
    }

    // تحديث المنتج
    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        price: price ? parseFloat(price) : undefined,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        mainImage,
        images: images || JSON.stringify([mainImage]),
        stock: stock ? parseInt(stock) : undefined,
        categoryId: categoryId || null,
        agentId: agentId || null,
        demoSessionId,
        supplierId,
        isFeatured:
          isFeatured !== undefined ? isFeatured : existingProduct.isFeatured,
        colors: typeof colors === "object" ? JSON.stringify(colors) : colors,
        sizes: typeof sizes === "object" ? JSON.stringify(sizes) : sizes,
        videoUrl,
        featuresAr,
        usageAr,
        ingredientsAr,
        inStock: inStock !== undefined ? inStock : existingProduct.inStock,
        estimatedDays: estimatedDays
          ? parseInt(estimatedDays)
          : existingProduct.estimatedDays,
      },
      include: {
        category: true,
        agent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // إشعار الإدارة بالتحديث
    await sendNotificationToAdmins({
      type: "SYSTEM",
      title: "✏️ تم تحديث منتج",
      message: `تم تحديث المنتج "${updatedProduct.nameAr}"`,
      data: { productId: updatedProduct.id },
    });

    // تحديث الواجهة عبر Pusher
    if (pusherServer) {
      await pusherServer.trigger("tarfah-public-channel", "public-update", {});
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المنتج" },
      { status: 500 },
    );
  }
}
