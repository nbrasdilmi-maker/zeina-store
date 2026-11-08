/**
 * Demo Session Management
 * manages secure demo sessions for the Interactive Demo Store.
 * Creates isolated data spaces per merchant/visitor using demoSessionId.
 */

import { db } from "./db";
import { generateAccessToken, generateRefreshToken, verifyToken } from "./security";
import { UserRole } from "@prisma/client";

export interface DemoSessionData {
  sessionId: string;
  role: UserRole;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    isGuest: boolean;
  };
}

export interface CreateDemoSessionOptions {
  guest?: boolean;
  name?: string;
  phone?: string;
}

/**
 * Copy the base catalog (demoSessionId = null) into a new demo session.
 * This gives every visitor a realistic storefront without sharing rows.
 */
async function seedDemoCatalog(
  demoSessionId: string,
  role: UserRole,
  demoUserId: string,
) {
  const suffix = demoSessionId.slice(-6);

  await db.$transaction(async (tx) => {
    // 1) Categories (slug must stay unique across the whole table).
    // Create parents and children first, then connect the hierarchy in a second
    // pass because a child may be created before its parent.
    const baseCategories = await tx.category.findMany({
      where: { demoSessionId: null },
    });

    const categoryMap = new Map<string, string>();
    for (const category of baseCategories) {
      const cloned = await tx.category.create({
        data: {
          name: category.name,
          nameAr: category.nameAr,
          slug: `${category.slug}-${suffix}`,
          image: category.image,
          demoSessionId,
        },
      });
      categoryMap.set(category.id, cloned.id);
    }

    for (const category of baseCategories) {
      if (!category.parentId) continue;
      const clonedId = categoryMap.get(category.id);
      const clonedParentId = categoryMap.get(category.parentId);
      if (!clonedId || !clonedParentId) continue;
      await tx.category.update({
        where: { id: clonedId },
        data: { parentId: clonedParentId },
      });
    }

    // 2) Merchant profile for the demo merchant role
    let merchantId: string | null = null;
    if (role === "MERCHANT") {
      const merchant = await tx.merchant.create({
        data: {
          userId: demoUserId,
          demoSessionId,
          storeName: "متجر زينة التجريبي",
          storeType: "عطور ومكياج",
          fullName: "تاجر تجريبي",
          phone: "+967700000000",
          email: `merchant-${demoSessionId}@zeina.store`,
          address: "الجمهورية اليمنية",
          identityCardImage: "demo-merchant",
          isApproved: true,
          isActive: true,
        },
      });
      merchantId = merchant.id;
    }

    // 3) Products
    const baseProducts = await tx.product.findMany({
      where: { demoSessionId: null },
    });

    for (const product of baseProducts) {
      await tx.product.create({
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
          categoryId: product.categoryId
            ? categoryMap.get(product.categoryId) || null
            : null,
          merchantId,
          agentId: role === "AGENT" ? demoUserId : null,
          demoSessionId,
        },
      });
    }

    // 4) Hero banners
    const baseBanners = await tx.heroBanner.findMany({
      where: { demoSessionId: null },
    });
    for (const banner of baseBanners) {
      await tx.heroBanner.create({
        data: {
          title: banner.title,
          titleAr: banner.titleAr,
          subtitleAr: banner.subtitleAr,
          description: banner.description,
          descriptionAr: banner.descriptionAr,
          image: banner.image,
          link: banner.link,
          ctaAr: banner.ctaAr,
          order: banner.order,
          isActive: banner.isActive,
          demoSessionId,
        },
      });
    }

    // 5) Advertisements
    const baseAds = await tx.advertisement.findMany({
      where: { demoSessionId: null },
    });
    for (const ad of baseAds) {
      await tx.advertisement.create({
        data: {
          title: ad.title,
          titleAr: ad.titleAr,
          description: ad.description,
          descriptionAr: ad.descriptionAr,
          price: ad.price,
          image: ad.image,
          link: ad.link,
          ctaAr: ad.ctaAr,
          isActive: ad.isActive,
          startDate: ad.startDate,
          endDate: ad.endDate,
          demoSessionId,
        },
      });
    }
  });
}

/**
 * Create a new demo session for the given role.
 * Creates a demo user in the database and returns a secure session token.
 */
export async function createDemoSession(
  role: UserRole,
  options: CreateDemoSessionOptions = {},
): Promise<DemoSessionData> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const isGuest = Boolean(options.guest);
  const guestName = String(options.name || "").trim().slice(0, 80);
  const guestPhone = String(options.phone || "").trim().slice(0, 20);

  // Create the demo session record
  const demoSession = await db.demoSession.create({
    data: {
      role,
      expiresAt,
    },
  });

  // Create a demo user linked to this session
  const roleLabels: Record<UserRole, string> = {
    ADMIN: "مدير التجريبي",
    MERCHANT: "تاجر تجريبي",
    AGENT: "مندوب تجريبي",
    CUSTOMER: "عميل تجريبي",
    GUEST: "زائر تجريبي",
  };

  const demoUser = await db.user.create({
    data: {
      email: isGuest
        ? `guest-${demoSession.id}@zeina.store`
        : `demo-${demoSession.id}@zeina.store`,
      name: isGuest ? guestName || "زائر زينة" : roleLabels[role],
      password: "", // No password for demo users
      phone: isGuest ? guestPhone || "+967700000000" : "+967700000000",
      role,
      isVerified: true,
      isActive: true,
      demoSessionId: demoSession.id,
    },
  });

  // Give the new session its own copy of the base catalog.
  try {
    await seedDemoCatalog(demoSession.id, role, demoUser.id);
  } catch (error) {
    console.error("Demo catalog seeding error:", error);
  }

  // Generate secure tokens
  const token = generateAccessToken({
    userId: demoUser.id,
    email: demoUser.email,
    role: demoUser.role,
    sessionId: demoSession.id,
    isDemo: true,
  });

  const refreshToken = generateRefreshToken(demoUser.id);

  return {
    sessionId: demoSession.id,
    role: demoUser.role,
    userId: demoUser.id,
    token,
    refreshToken,
    expiresAt,
    user: {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      phone: demoUser.phone,
      role: demoUser.role,
      isGuest,
    },
  };
}

/**
 * Verify a demo session token and return the session data.
 * Returns null if the token is invalid or not a demo session.
 */
export async function verifyDemoSession(token: string): Promise<{
  valid: boolean;
  userId?: string;
  role?: UserRole;
  sessionId?: string;
  isDemo?: boolean;
} | null> {
  try {
    const result = verifyToken(token);
    if (!result.valid || !result.payload) {
      return null;
    }

    const payload = result.payload as any;
    if (!payload.isDemo) {
      return null;
    }

    // Verify the demo session still exists and is not expired
    const demoSession = await db.demoSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!demoSession || demoSession.expiresAt < new Date()) {
      return null;
    }

    return {
      valid: true,
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
      isDemo: true,
    };
  } catch {
    return null;
  }
}

/**
 * Get the demo session filter for Prisma queries.
 * Ensures data isolation between different demo sessions.
 */
export function getDemoFilter(sessionId: string) {
  return {
    demoSessionId: sessionId,
  };
}

/**
 * Check if a request has a valid demo session.
 * Extracts the token from the Authorization header.
 */
export async function verifyDemoAuth(req: Request): Promise<{
  valid: boolean;
  userId?: string;
  role?: UserRole;
  sessionId?: string;
  isDemo?: boolean;
} | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  return verifyDemoSession(token);
}

/**
 * Delete every row that belongs to a demo session, then the session itself.
 * Relations are mostly `SetNull`, so we remove children explicitly.
 */
export async function deleteDemoSessionData(sessionId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    // Financial rows first (they reference orders/suppliers)
    await tx.transaction.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.inventoryTransaction.deleteMany({
      where: { demoSessionId: sessionId },
    });

    // Interactions
    await tx.review.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.notification.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.message.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.conversation.deleteMany({ where: { demoSessionId: sessionId } });

    // Orders and their items
    await tx.order.deleteMany({ where: { demoSessionId: sessionId } });

    // Catalog
    await tx.product.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.category.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.heroBanner.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.advertisement.deleteMany({ where: { demoSessionId: sessionId } });

    // Merchant / supplier profiles
    await tx.supplier.deleteMany({ where: { demoSessionId: sessionId } });
    await tx.merchant.deleteMany({ where: { demoSessionId: sessionId } });

    // Users last (sessions, push subscriptions and codes cascade)
    await tx.user.deleteMany({ where: { demoSessionId: sessionId } });

    await tx.demoSession.delete({ where: { id: sessionId } });
  });
}

/**
 * Clean up expired demo sessions (call periodically).
 * `limit` keeps each request bounded so a single API call never performs an
 * unbounded delete sweep.
 */
export async function cleanupExpiredDemoSessions(limit = 2) {
  try {
    const expired = await db.demoSession.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true },
      orderBy: { expiresAt: "asc" },
      take: limit,
    });

    for (const session of expired) {
      try {
        await deleteDemoSessionData(session.id);
      } catch (error) {
        console.error(`Demo session cleanup error (${session.id}):`, error);
      }
    }
  } catch (error) {
    console.error("Demo session cleanup error:", error);
  }
}
