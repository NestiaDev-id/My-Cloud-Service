import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import crypto from "crypto";

const ALGORITHM = "HS256";

/**
 * Create a JWT token manually using Node.js crypto (no external dependency).
 */
export function createJWT(payload: Record<string, any>): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[Security] JWT_SECRET is not configured.");
  }

  const header = { alg: ALGORITHM, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: payload.exp || now + 7 * 24 * 60 * 60, // Default: 7 days
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a JWT token. Returns null if invalid.
 */
export function verifyJWT(token: string): Record<string, any> | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, tokenSignature] = parts;

    // Verify signature
    const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret);
    if (!timingSafeEqual(tokenSignature, expectedSignature)) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware untuk memastikan hanya Admin yang bisa mengakses rute ini.
 * Verifikasi JWT dari cookie 'admin_token'.
 */
export async function authMiddleware(c: Context, next: Next) {
  const adminToken = getCookie(c, "admin_token");

  if (!adminToken) {
    return c.json({ error: "Unauthorized: Admin access required" }, 401);
  }

  const payload = verifyJWT(adminToken);

  if (!payload || payload.role !== "admin") {
    return c.json({ error: "Unauthorized: Invalid or expired session" }, 401);
  }

  // Store admin info in context for downstream handlers
  c.set("adminEmail", payload.email);

  await next();
}

// --- Crypto Helpers ---

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

function sign(data: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}
