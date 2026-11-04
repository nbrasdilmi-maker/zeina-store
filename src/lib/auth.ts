/**
 * Authentication Module
 * Uses the security module for password hashing and verification
 */

import { db } from "./db";
import {
  generateVerificationCode as secureGenerateCode,
  generateToken as secureGenerateToken,
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateSessionId,
  addUserSession,
  logSecurityEvent,
  sanitizeInput,
} from "./security";
import { verifyDemoSession } from "./demo-session";

// Re-export for backward compatibility
export const generateVerificationCode = secureGenerateCode;
export const generateToken = secureGenerateToken;
export { hashPassword, verifyPassword };

// Create verification code for user
export async function createVerificationCode(
  userId: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
): Promise<string> {
  const code = secureGenerateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Invalidate previous codes of same type
  await db.verificationCode.updateMany({
    where: {
      userId,
      type,
      used: false,
    },
    data: { used: true },
  });

  await db.verificationCode.create({
    data: {
      userId,
      code,
      type,
      expiresAt,
    },
  });

  return code;
}

// Verify the code
export async function verifyCode(
  userId: string,
  code: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
): Promise<boolean> {
  // Sanitize inputs
  const sanitizedUserId = sanitizeInput(userId);
  const sanitizedCode = sanitizeInput(code);

  const verificationCode = await db.verificationCode.findFirst({
    where: {
      userId: sanitizedUserId,
      code: sanitizedCode,
      type,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!verificationCode) {
    logSecurityEvent({
      action: "VERIFICATION_FAILED",
      userId: sanitizedUserId,
      status: "FAILURE",
      details: `Invalid ${type} code`,
    });
    return false;
  }

  // Mark as used
  await db.verificationCode.update({
    where: { id: verificationCode.id },
    data: { used: true },
  });

  // If email verification, mark user as verified
  if (type === "EMAIL_VERIFICATION") {
    await db.user.update({
      where: { id: sanitizedUserId },
      data: { isVerified: true },
    });

    logSecurityEvent({
      action: "EMAIL_VERIFIED",
      userId: sanitizedUserId,
      status: "SUCCESS",
    });
  }

  return true;
}

// Generate auth tokens for user
export async function generateAuthTokens(user: { id: string; email: string; role: string }) {
  const sessionId = generateSessionId();
  
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  });

  const refreshToken = generateRefreshToken(user.id);

  // Track session
  addUserSession(user.id, sessionId);

  return {
    accessToken,
    refreshToken,
    sessionId,
  };
}

// Verify JWT token
export { verifyToken };

// Session management
export { generateSessionId, addUserSession };

// Security logging
export { logSecurityEvent };
// Identity verification function needed by the statistics file
function getRequestToken(req: Request): string | null {
    const authHeader = req.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7).trim();
    }

    // Demo sessions also set a same-site cookie so ordinary page fetches
    // (which do not add Authorization headers) stay inside the session.
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) {
        return null;
    }

    for (const part of cookieHeader.split(";")) {
        const [name, ...valueParts] = part.trim().split("=");
        if (name === "token" || name === "demo_token") {
            const value = valueParts.join("=");
            try {
                return decodeURIComponent(value);
            } catch {
                return value;
            }
        }
    }

    return null;
}

export async function verifyAuth(req: Request) {
    const token = getRequestToken(req);

    if (!token) {
        return null;
    }

    try {
        const result = verifyToken(token);

        if (!result.valid || !result.payload) {
            return null;
        }

        const payload = result.payload as any;

        // Demo session verification
        if (payload.isDemo) {
            const demoSession = await verifyDemoSession(token);
            if (!demoSession) {
                return null;
            }
            return {
                id: demoSession.userId,
                email: payload.email,
                role: demoSession.role,
                isDemo: true,
                demoSessionId: demoSession.sessionId,
            };
        }

        // Regular session verification
        if (!payload.userId) {
            return null;
        }

        const user = await db.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true }
        });

        return user;
    } catch (error) {
        return null;
    }
}

/**
 * Verify demo session from request
 */
export async function verifyDemoAuth(req: Request) {
    const token = getRequestToken(req);

    if (!token) {
        return null;
    }

    return verifyDemoSession(token);
}