import mongoose from "mongoose";
import crypto from "crypto";

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a deterministic time-based route token.
 * We hash the current time window with the JWT_SECRET.
 * This ensures all Vercel serverless functions agree on the token.
 */
function generateTimeBasedToken(timestamp: number): string {
  const windowId = Math.floor(timestamp / WINDOW_MS);
  const secret = process.env.JWT_SECRET || "fallback-secret-for-dev";
  
  // Use HMAC to make it unguessable for attackers
  const hash = crypto.createHmac("sha256", secret)
                     .update(windowId.toString())
                     .digest("hex");
                     
  return hash.substring(0, 8); // Return first 8 chars, e.g. "a7b3f1e2"
}

/**
 * Get the current active route token.
 */
export function getActiveRouteToken(): string {
  return generateTimeBasedToken(Date.now());
}

/**
 * Check if a given token is valid (current OR previous window).
 * We allow the previous window (grace period) to prevent race conditions
 * if a request is in-flight right as the 5-minute window changes.
 */
export function isValidRouteToken(token: string): boolean {
  const now = Date.now();
  const currentToken = generateTimeBasedToken(now);
  const previousToken = generateTimeBasedToken(now - WINDOW_MS);
  
  return token === currentToken || token === previousToken;
}

/**
 * Memulai detak jantung (heartbeat) untuk menjaga koneksi MongoDB tetap aktif.
 * Berguna terutama untuk MongoDB Atlas tier gratis agar tidak masuk mode sleep.
 * Catatan: Vercel mengabaikan setInterval ini, ini hanya jalan di environment persistent (VPS/Local).
 */
export function startHeartbeat() {
  const INTERVAL_MS = 5 * 60 * 1000; // Setiap 5 menit

  console.log("💓 Heartbeat job started (Every 5 minutes)");
  console.log(`🔑 Initial route token: ${getActiveRouteToken()}`);

  setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        // Melakukan ping ringan ke database
        await mongoose.connection.db?.admin().ping();
        console.log(`[${new Date().toLocaleTimeString()}] 💓 Database ping success`);
        console.log(`🔄 Current Route Token: ${getActiveRouteToken()}`);
      }
    } catch (error) {
      console.error("❌ Heartbeat ping failed:", error);
    }
  }, INTERVAL_MS);
}
