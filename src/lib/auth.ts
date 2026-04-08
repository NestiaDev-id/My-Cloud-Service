import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

/**
 * Middleware untuk memastikan hanya Admin yang bisa mengakses rute ini.
 * Memeriksa keberadaan cookie 'admin_token'.
 */
export async function authMiddleware(c: Context, next: Next) {
  // Dalam production, sebaiknya gunakan JWT atau signed cookie yang divalidasi
  const adminToken = getCookie(c, "admin_token");

  if (!adminToken || adminToken !== "active_admin_session") {
    return c.json({ error: "Unauthorized: Admin access required" }, 401);
  }

  await next();
}
