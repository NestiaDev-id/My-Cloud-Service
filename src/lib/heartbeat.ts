import mongoose from "mongoose";
import crypto from "crypto";

/**
 * Active Route Token — berputar setiap heartbeat cycle.
 * Digunakan untuk Moving Target Defense pada endpoint sensitif.
 */
let activeRouteToken: string = generateToken();
let previousRouteToken: string = activeRouteToken; // Grace period

function generateToken(): string {
  return crypto.randomBytes(4).toString("hex"); // 8 hex chars, e.g., "a7b3f1e2"
}

/**
 * Get the current active route token.
 */
export function getActiveRouteToken(): string {
  return activeRouteToken;
}

/**
 * Check if a given token is valid (current OR previous — grace period).
 */
export function isValidRouteToken(token: string): boolean {
  return token === activeRouteToken || token === previousRouteToken;
}

/**
 * Memulai detak jantung (heartbeat) untuk menjaga koneksi MongoDB tetap aktif.
 * Juga merotasi route token setiap siklus (Moving Target Defense).
 * Berguna terutama untuk MongoDB Atlas tier gratis agar tidak masuk mode sleep.
 */
export function startHeartbeat() {
  const INTERVAL_MS = 5 * 60 * 1000; // Setiap 5 menit

  console.log("💓 Heartbeat job started (Every 5 minutes)");
  console.log(`🔑 Initial route token: ${activeRouteToken}`);

  setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        // Melakukan ping ringan ke database
        await mongoose.connection.db?.admin().ping();
        console.log(`[${new Date().toLocaleTimeString()}] 💓 Database ping success`);
      } else {
        console.warn(`[${new Date().toLocaleTimeString()}] ⚠️ Database not ready for ping (Status: ${mongoose.connection.readyState})`);
      }
    } catch (error) {
      console.error("❌ Heartbeat ping failed:", error);
    }

    // Rotate route token
    previousRouteToken = activeRouteToken;
    activeRouteToken = generateToken();
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Route token rotated: ${activeRouteToken}`);
  }, INTERVAL_MS);
}
