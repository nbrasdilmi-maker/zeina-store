import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { sendNotificationToAdmins } from "@/lib/notifications";
import { deleteBlobImage } from "@/lib/blob-server";
import { verifyAuth } from "@/lib/auth";

// Get all products - filtered by demo session for data isolation
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    const demoSessionId = (authUser as any)?.demoSessionId;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const agentId = searchParams.get("agentId");
    const isFeatured = searchParams.get("isFeatured");
    const all = searchParams.get("all");
    const search = searchParams.get("search")?.trim();
    const minPrice = Number(searchParams.get("minPrice"));
    const maxPrice = Number(searchParams.get("maxPrice"));
    const inStock = searchParams.get("inStock");
    const sort = searchParams.get("sort");

    // If "all=true", show all products including inactive ones (for admin)
    const where: Record<string, unknown> =
      all === "true" ? {} : { isActive: true };

    // Filter by demo session for data isolation.
    // Unauthenticated/regular visitors only see the base catalog.
    where.demoSessionId = demoSessionId ?? null;

    if (categoryId) {
      // Accept either a category id or slug, and include subcategory products
      // when a parent category is selected.
      const category = await db.category.findFirst({
        where: { OR: [{ id: categoryId }, { slug: categoryId }] },
        include: { children: { select: { id: true } } },
      });

      if (category) {
        where.categoryId = {
          in: [category.id, ...category.children.map((child) => child.id)],
        };
      } else {
        where.categoryId = categoryId;
      }
    }

    if (agentId) where.agentId = agentId;
    if (isFeatured === "true") where.isFeatured = true;
    if (inStock === "true") where.inStock = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nameAr: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { descriptionAr: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (searchParams.get("minPrice") !== null || searchParams.get("maxPrice") !== null) {
      const price: Record<string, number> = {};
      if (Number.isFinite(minPrice)) price.gte = minPrice;
      if (Number.isFinite(maxPrice) && maxPrice > 0) price.lte = maxPrice;
      where.price = price;
    }

    const orderBy: Record<string, "asc" | "desc"> =
      sort === "price-low"
        ? { price: "asc" }
        : sort === "price-high"
          ? { price: "desc" }
          : sort === "name"
            ? { nameAr: "asc" }
            : { createdAt: "desc" };

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy,
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب المنتجات" },
      { status: 500 },
    );
  }
}

// Create product
export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;

    const body = await request.json();
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

    // 1. إذا كان هناك agentId، تحقق من وجود Supplier لهذا المستخدم
    let supplierId: string | null = null;
    if (agentId) {
      // جلب بيانات المستخدم
      const user = await db.user.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, role: true, demoSessionId: true },
      });

      if (
        user &&
        (user.role === "AGENT" ||
          user.role === "ADMIN" ||
          user.role === "MERCHANT") &&
        user.demoSessionId === demoSessionId
      ) {
        // تحقق من وجود Supplier بنفس userId
        let supplier = await db.supplier.findUnique({
          where: { userId: agentId },
        });

        if (!supplier) {
          // إنشاء Supplier جديد
          supplier = await db.supplier.create({
            data: {
              userId: agentId,
              demoSessionId,
              name: user.name,
              type: user.role as any, // MERCHANT, AGENT, ADMIN
              commission: null,
            },
          });
        }

        supplierId = supplier.id;
      }
    }

    // 2. إنشاء المنتج مع supplierId و demoSessionId
    const product = await db.product.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        mainImage,
        images: images || JSON.stringify([mainImage]),
        stock: parseInt(stock) || 0,
        categoryId,
        agentId,
        demoSessionId,
        supplierId, // ← ربط بالمورد
        isFeatured: isFeatured || false,
        colors: typeof colors === "object" ? JSON.stringify(colors) : colors,
        sizes: typeof sizes === "object" ? JSON.stringify(sizes) : sizes,
        videoUrl,
        featuresAr,
        usageAr,
        ingredientsAr,
        inStock: inStock !== undefined ? inStock : true,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
      },
    });

    // 3. إشعار الإدارة بوجود منتج جديد
    await sendNotificationToAdmins({
      type: "SYSTEM",
      title: "منتج جديد تمت إضافته 🏷️",
      message: `تم إضافة منتج جديد بعنوان: ${product.nameAr}، يرجى مراجعته.`,
      data: { productId: product.id },
    });

    // 4. تحديث الواجهة الرئيسية للزوار صامتاً
    if (pusherServer) {
      await pusherServer.trigger("tarfah-public-channel", "public-update", {});
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء المنتج" },
      { status: 500 },
    );
  }
}

// Delete product
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const demoSessionId = (authUser as any)?.demoSessionId;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "معرف المنتج مطلوب" }, { status: 400 });
    }

    // 1. جلب بيانات المنتج للتحقق من الملكية قبل الحذف
    const productData = await db.product.findUnique({
      where: { id: productId },
      select: { mainImage: true, images: true, demoSessionId: true },
    });

    if (!productData) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    // التحقق من أن المنتج ينتمي لجلسة التجريبي الحالية
    if (demoSessionId && productData.demoSessionId !== demoSessionId) {
      return NextResponse.json(
        { error: "غير مسموح لك بحذف هذا المنتج" },
        { status: 403 },
      );
    }

    if (productData) {
      // 2. حذف الصورة الأساسية من السحابة
      if (productData.mainImage) {
        await deleteBlobImage(productData.mainImage);
      }

      // 3. حذف صور المعرض (Gallery) من السحابة
      if (productData.images) {
        try {
          const additionalImages = JSON.parse(productData.images);
          if (Array.isArray(additionalImages)) {
            for (const imgUrl of additionalImages) {
              if (imgUrl !== productData.mainImage) {
                await deleteBlobImage(imgUrl);
              }
            }
          }
        } catch (e) {
          console.error("Error parsing/deleting gallery images:", e);
        }
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

    if (pusherServer) {
      await pusherServer.trigger("tarfah-public-channel", "public-update", {});
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف المنتج وصوره نهائياً",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف المنتج" },
      { status: 500 },
    );
  }
}
