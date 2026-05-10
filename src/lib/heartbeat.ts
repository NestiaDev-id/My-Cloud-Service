import mongoose from "mongoose";

/**
 * Memulai detak jantung (heartbeat) untuk menjaga koneksi MongoDB tetap aktif.
 * Berguna terutama untuk MongoDB Atlas tier gratis agar tidak masuk mode sleep.
 */
export function startHeartbeat() {
  const INTERVAL_MS = 5 * 60 * 1000; // Setiap 5 menit

  console.log("💓 Heartbeat job started (Every 5 minutes)");

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
  }, INTERVAL_MS);
}
