import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "seethrough_admin";

/** Temporary default until SEETHROUGH_ADMIN_PASSWORD is set in env. */
const DEFAULT_ADMIN_PASSWORD = "password";

export function getAdminPassword(): string {
  return process.env.SEETHROUGH_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;
}

/** Deterministic session token — rotating the password invalidates cookies. */
export function adminSessionToken(): string {
  return createHash("sha256")
    .update(`seethrough-admin:${getAdminPassword()}`)
    .digest("hex");
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyAdminPassword(password: string): boolean {
  return safeEqualString(password, getAdminPassword());
}

export function parseCookieHeader(
  header: string | null,
): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function isAdminAuthenticated(request: Request): boolean {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[ADMIN_COOKIE];
  if (!token) return false;
  return safeEqualString(token, adminSessionToken());
}

export function adminAuthCookieHeader(maxAgeSeconds = 60 * 60 * 24 * 7): string {
  const token = encodeURIComponent(adminSessionToken());
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearAdminAuthCookieHeader(): string {
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function unauthorizedAdminResponse(): Response {
  return Response.json({ error: "Admin sign-in required" }, { status: 401 });
}
