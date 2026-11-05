/**
 * Demo session helpers (client-side only)
 *
 * Keeps the browser storage, the auth cookie and the generic "user"/"token"
 * keys used by the existing dashboards in sync. Every helper is safe to call
 * during SSR: it simply does nothing when `window` is unavailable.
 */

export const DEMO_SESSION_EVENT = "zeina:demo-session";

const CART_STORAGE_KEY = "tarifa_cart";
const WISHLIST_STORAGE_KEY = "tarifa_wishlist";

export type DemoRole = "ADMIN" | "MERCHANT" | "AGENT" | "CUSTOMER";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  isGuest?: boolean;
  address?: string;
  demoSessionId?: string;
}

export interface DemoSessionSnapshot {
  user: DemoUser;
  token: string;
  sessionId: string;
  role: string;
  expiresAt?: string;
}

export interface CreateDemoSessionOptions {
  guest?: boolean;
  name?: string;
  phone?: string;
}

const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeUser(raw: any): DemoUser {
  return {
    id: String(raw?.id || ""),
    name: String(raw?.name || "مستخدم تجريبي"),
    email: String(raw?.email || ""),
    phone: String(raw?.phone || ""),
    role: String(raw?.role || "CUSTOMER"),
    isVerified: raw?.isVerified !== false,
    isGuest: Boolean(raw?.isGuest),
    address: raw?.address ? String(raw.address) : undefined,
    demoSessionId: raw?.demoSessionId
      ? String(raw.demoSessionId)
      : undefined,
  };
}

function cookieMaxAge(expiresAt?: string): number {
  if (!expiresAt) return SESSION_COOKIE_MAX_AGE;
  const remaining = Math.floor(
    (new Date(expiresAt).getTime() - Date.now()) / 1000,
  );
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return SESSION_COOKIE_MAX_AGE;
  }
  return Math.min(remaining, SESSION_COOKIE_MAX_AGE);
}

function writeAuthCookie(token: string, expiresAt?: string) {
  if (!isBrowser()) return;
  const maxAge = token ? cookieMaxAge(expiresAt) : 0;
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function notify(user: DemoUser | null) {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent(DEMO_SESSION_EVENT, { detail: user }),
  );
}

/**
 * Read the demo session saved by the role switcher.
 * Returns null when any of the three required keys is missing/corrupted.
 */
export function readDemoSession(): DemoSessionSnapshot | null {
  if (!isBrowser()) return null;

  const rawUser = localStorage.getItem("demo_user");
  const token = localStorage.getItem("demo_token");
  const sessionId = localStorage.getItem("demo_session_id");

  if (!rawUser || !token || !sessionId) return null;

  try {
    const user = normalizeUser(JSON.parse(rawUser));
    if (!user.id) return null;

    return {
      user: {
        ...user,
        demoSessionId: user.demoSessionId || sessionId,
      },
      token,
      sessionId,
      role: user.role,
    };
  } catch {
    return null;
  }
}

/**
 * The rest of the store reads `localStorage.user` / `localStorage.token`.
 * Mirror the demo session there so dashboards and fetchWithAuth keep working.
 */
export function syncGenericAuthStorage(session: DemoSessionSnapshot) {
  if (!isBrowser()) return;
  const user = {
    ...session.user,
    demoSessionId: session.user.demoSessionId || session.sessionId,
  };
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", session.token);
  writeAuthCookie(session.token, session.expiresAt);
}

/**
 * Return the currently active identity, whether it is a demo session or a
 * regular logged-in user. Demo sessions take precedence.
 */
export function readAnyUser(): DemoUser | null {
  if (!isBrowser()) return null;

  const demo = readDemoSession();
  if (demo) {
    syncGenericAuthStorage(demo);
    return demo.user;
  }

  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    const user = normalizeUser(JSON.parse(rawUser));
    return user.id ? user : null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string {
  if (!isBrowser()) return "";
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("demo_token") ||
    ""
  );
}

export function saveDemoSession(
  snapshot: DemoSessionSnapshot,
): DemoSessionSnapshot {
  if (!isBrowser()) return snapshot;

  const user = {
    ...normalizeUser(snapshot.user),
    demoSessionId: snapshot.sessionId,
  };

  localStorage.setItem("demo_user", JSON.stringify(user));
  localStorage.setItem("demo_token", snapshot.token);
  localStorage.setItem("demo_session_id", snapshot.sessionId);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", snapshot.token);
  writeAuthCookie(snapshot.token, snapshot.expiresAt);

  const saved: DemoSessionSnapshot = {
    ...snapshot,
    user,
    role: user.role,
  };
  notify(user);
  return saved;
}

/**
 * Local-only sign out. Server rows stay available until the demo session
 * expires; this only removes this browser's access to them.
 */
export function clearDemoSession() {
  if (!isBrowser()) return;

  [
    "user",
    "token",
    "demo_user",
    "demo_token",
    "demo_session_id",
  ].forEach((key) => localStorage.removeItem(key));

  writeAuthCookie("");
  notify(null);
}

/**
 * Product ids change between demo sessions, so selections that point at the
 * previous catalog are cleared when the visitor switches role or exits.
 */
export function clearDemoShoppingSelection() {
  if (!isBrowser()) return;
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(WISHLIST_STORAGE_KEY);
}

export function isGuestCheckoutEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_GUEST_CHECKOUT !== "false";
}

/**
 * Create a demo session through the API and persist it locally.
 */
export async function requestDemoSession(
  role: string,
  options: CreateDemoSessionOptions = {},
): Promise<DemoSessionSnapshot> {
  const response = await fetch("/api/demo/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role,
      ...(options.guest
        ? {
            guest: true,
            name: options.name,
            phone: options.phone,
          }
        : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (
    !response.ok ||
    !data?.token ||
    !data?.sessionId ||
    !data?.userId
  ) {
    throw new Error(data?.error || "تعذر إنشاء جلسة التجربة");
  }

  const user = normalizeUser(
    data.user || {
      id: data.userId,
      name: options.guest
        ? options.name || "زائر زينة"
        : "مستخدم تجريبي",
      email: data.email || "",
      phone: options.phone || "",
      role: data.role || role,
      isVerified: true,
      isGuest: Boolean(options.guest),
    },
  );

  return saveDemoSession({
    user,
    token: data.token,
    sessionId: data.sessionId,
    role: data.role || role,
    expiresAt: data.expiresAt,
  });
}

/**
 * Resolve the identity used for checkout:
 * 1. an existing demo session,
 * 2. a regular logged-in user,
 * 3. a temporary guest demo session created from the checkout form.
 */
export async function ensureCheckoutIdentity(input: {
  name?: string;
  phone?: string;
}): Promise<{ user: DemoUser; token: string }> {
  if (!isBrowser()) {
    throw new Error("تعذر تجهيز جلسة الشراء");
  }

  const demo = readDemoSession();
  if (demo) {
    syncGenericAuthStorage(demo);
    return { user: demo.user, token: demo.token };
  }

  const rawUser = localStorage.getItem("user");
  const genericToken = localStorage.getItem("token");
  if (rawUser && genericToken) {
    try {
      const user = normalizeUser(JSON.parse(rawUser));
      if (user.id) return { user, token: genericToken };
    } catch {
      // Fall through to guest session creation.
    }
  }

  if (!isGuestCheckoutEnabled()) {
    throw new Error("تسجيل الدخول مطلوب لإتمام الطلب");
  }

  const name = String(input.name || "").trim();
  const phone = String(input.phone || "").trim();

  if (name.length < 2) {
    throw new Error("يرجى كتابة الاسم الكامل لإتمام الطلب كزائر");
  }
  if (phone.length < 6) {
    throw new Error("يرجى كتابة رقم هاتف صحيح لإتمام الطلب كزائر");
  }

  const session = await requestDemoSession("CUSTOMER", {
    guest: true,
    name,
    phone,
  });

  return { user: session.user, token: session.token };
}
