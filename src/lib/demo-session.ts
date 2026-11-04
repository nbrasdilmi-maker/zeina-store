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
}

/**
 * Create a new demo session for the given role.
 * Creates a demo user in the database and returns a secure session token.
 */
export async function createDemoSession(role: UserRole): Promise<DemoSessionData> {
  const sessionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

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
      email: `demo-${sessionId}@zeina.store`,
      name: roleLabels[role],
      password: "", // No password for demo users
      phone: "+967700000000",
      role,
      isVerified: true,
      isActive: true,
      demoSessionId: demoSession.id,
    },
  });

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
 * Clean up expired demo sessions (call periodically).
 */
export async function cleanupExpiredDemoSessions() {
  try {
    await db.demoSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Demo session cleanup error:", error);
  }
}
