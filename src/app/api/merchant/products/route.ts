import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { deleteBlobImage } from "@/lib/blob-server";

export const dynamic = "force-dynamic";

// دالة مساعدة لجلب ملف التاجر المرتبط بالجلسة التجريبية
async function getOrHealMerchant(userId: string, demoSessionId?: string) {
  let merchant = await db.merchant.findFirst({
    where: { userId },
  });

  if (!merchant) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      try {
        merchant = await db.merchant.create({
          data: {
            userId: user.id,
            demoSessionId,
            storeName: user.name ? `متجر ${user.name}` : "متجر جديد",
            storeType: "عام",
            fullName: user.name || "تاجر",
            phone: user.phone || "000000000",
            email: user.email,
            address: user.address || "غير محدد",
            identityCardImage: "auto-healed-profile",
            isApproved: true,
            isActive: true,
          },
        });
      } catch (e) {
        console.error("❌ [Auto-Heal] فشل في إنشاء ملف المتجر التلقائي:", e);
        return null;
      }
    }
  }
  return merchant;
}

// GET - جلب منتجات التاجر (مع عزل الجلسة التجريبية)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const decoded = user as any;
    if (decoded.role !== "MERCHANT") {
      return NextResponse.json(
        { success: false, error: "هذه الميزة للتاجر فقط" },
        { status: 403 },
      );
    }

    const demoSessionId = decoded.demoSessionId;

    const merchant = await getOrHealMerchant(decoded.userId, demoSessionId);

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على بيانات التاجر",
        },
        { status: 404 },
      );
    }

    const where: Record<string, unknown> = { merchantId: merchant.id };
    if (demoSessionId) {
      where.demoSessionId = demoSessionId;
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, nameAr: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Merchant products error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 },
    );
  }
}

// POST - إضافة منتج جديد
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const decoded = user as any;
    if (decoded.role !== "MERCHANT") {
      return NextResponse.json(
        { success: false, error: "هذه الميزة للتاجر فقط" },
        { status: 403 },
      );
    }

    const demoSessionId = decoded.demoSessionId;

    const merchant = await getOrHealMerchant(decoded.userId, demoSessionId);

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على بيانات التاجر",
        },
        { status: 404 },
      );
    }

    if (!merchant.isApproved) {
      return NextResponse.json(
        { success: false, error: "لم يتم تفعيل حسابك بعد" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name, nameAr, description, descriptionAr, price,
      originalPrice, images, mainImage, stock, sku, colors,
      inStock, estimatedDays, categoryId,
    } = body;

    if (!name || !nameAr || !price || !mainImage) {
      return NextResponse.json(
        { success: false, error: "يرجى ملء جميع الحقول المطلوبة" },
        { status: 400 },
      );
    }

    const product = await db.product.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        images: images || "[]",
        mainImage,
        stock: stock ? parseInt(stock) : 0,
        sku,
        colors,
        inStock: inStock !== undefined ? inStock : true,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
        categoryId,
        agentId: decoded.userId,
        merchantId: merchant.id,
        demoSessionId,
      },
    });

    return NextResponse.json({
      success: true,
      product,
      message: "تم إضافة المنتج بنجاح",
    });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 },
    );
  }
}

// PUT - تحديث منتج
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const decoded = user as any;
    if (decoded.role !== "MERCHANT") {
      return NextResponse.json(
        { success: false, error: "هذه الميزة للتاجر فقط" },
        { status: 403 },
      );
    }

    const demoSessionId = decoded.demoSessionId;
    const merchant = await getOrHealMerchant(decoded.userId, demoSessionId);

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على بيانات التاجر",
        },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف المنتج مطلوب" },
        { status: 400 },
      );
    }

    const existingProduct = await db.product.findFirst({
      where: { id, merchantId: merchant.id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "المنتج غير موجود" },
        { status: 404 },
      );
    }

    if (demoSessionId && existingProduct.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { success: false, error: "غير مسموح لك بتعديل هذا المنتج" },
        { status: 403 },
      );
    }

    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        name: updateData.name,
        nameAr: updateData.nameAr,
        description: updateData.description,
        descriptionAr: updateData.descriptionAr,
        price: updateData.price ? parseFloat(updateData.price) : undefined,
        originalPrice: updateData.originalPrice
          ? parseFloat(updateData.originalPrice)
          : null,
        images: updateData.images,
        mainImage: updateData.mainImage,
        stock: updateData.stock ? parseInt(updateData.stock) : undefined,
        sku: updateData.sku,
        colors: updateData.colors,
        inStock: updateData.inStock,
        estimatedDays: updateData.estimatedDays
          ? parseInt(updateData.estimatedDays)
          : null,
        categoryId: updateData.categoryId,
        isActive: updateData.isActive,
        isFeatured: updateData.isFeatured,
        demoSessionId,
      },
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: "تم تحديث المنتج بنجاح",
    });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 },
    );
  }
}

// DELETE - حذف منتج
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 },
      );
    }

    const decoded = user as any;
    if (decoded.role !== "MERCHANT") {
      return NextResponse.json(
        { success: false, error: "هذه الميزة للتاجر فقط" },
        { status: 403 },
      );
    }

    const demoSessionId = decoded.demoSessionId;
    const merchant = await getOrHealMerchant(decoded.userId, demoSessionId);

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على بيانات التاجر",
        },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "معرف المنتج مطلوب" },
        { status: 400 },
      );
    }

    const existingProduct = await db.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id,
      },
      select: {
        id: true,
        mainImage: true,
        images: true,
        demoSessionId: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "المنتج غير موجود أو لا تملك صلاحية حذفه" },
        { status: 404 },
      );
    }

    if (demoSessionId && existingProduct.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { success: false, error: "غير مسموح لك بحذف هذا المنتج" },
        { status: 403 },
      );
    }

    if (existingProduct.mainImage) {
      await deleteBlobImage(existingProduct.mainImage);
    }

    if (existingProduct.images) {
      try {
        const additionalImages = JSON.parse(existingProduct.images);
        if (Array.isArray(additionalImages)) {
          for (const imgUrl of additionalImages) {
            if (imgUrl !== existingProduct.mainImage) {
              await deleteBlobImage(imgUrl);
            }
          }
        }
      } catch (e) {
        console.error("Error deleting gallery images from cloud:", e);
      }
    }

    try {
      await db.product.delete({
        where: { id: productId },
      });
    } catch (error: any) {
      if (error.code === "P2003") {
        await db.product.update({
          where: { id: productId },
          data: { isActive: false },
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: "تمت عملية الحذف بنجاح",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم أثناء عملية الحذف" },
      { status: 500 },
    );
  }
}
