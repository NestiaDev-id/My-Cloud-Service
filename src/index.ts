import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "dotenv/config";

import { connectDB } from "./lib/db.js";
import accountsApi from "./api/accounts.js";
import driveApi from "./api/drive.js";
import uploadApi from "./api/upload.js";
import authApi from "./api/auth.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Health check
app.get("/", (c) => {
  return c.json({
    message: "My Cloud Service API",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (c) => {
  try {
    const dbStatus =
      import.meta.env.NODE_ENV === "test" || (await connectDB())
        ? "connected"
        : "disconnected";
    return c.json({
      status: "ok",
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return c.json(
      { status: "error", database: "disconnected" },
      500,
    );
  }
});

// API Routes
app.route("/api/auth", authApi);
app.route("/api/accounts", accountsApi);
app.route("/api/drive", driveApi);
app.route("/api/upload", uploadApi);

// Start server
const port = parseInt(process.env.PORT || "3000");

async function main() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB Atlas");

    serve({
      fetch: app.fetch,
      port,
    });

    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main();
