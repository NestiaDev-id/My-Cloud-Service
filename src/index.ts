import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import "dotenv/config";

import { connectDB } from "./lib/db.js";
import accountsApi from "./api/accounts.js";
import driveApi from "./api/drive.js";
import uploadApi from "./api/upload.js";
import authApi from "./api/auth.js";
import apikeysApi from "./api/apikeys.js";
import { startCleanupJob } from "./lib/cleanup.js";
import { startHeartbeat } from "./lib/heartbeat.js";
import { authMiddleware } from "./lib/auth.js";
import { apiReference } from "@scalar/hono-api-reference";
import { openApiSpec } from "./api/docs.js";
import { AuditLog } from "./models/AuditLog.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Health check & Info
app.get("/", (c) => {
  return c.json({
    message: "My Cloud Service API",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (c) => {
  try {
    if (process.env.NODE_ENV !== "test") {
      await connectDB();
    }
    return c.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Health check failed:", error);
    return c.json(
      { status: "error", database: "disconnected", message: error.message },
      500,
    );
  }
});

// API Documentation (Scalar) — Protected: Admin only
app.get("/reference", authMiddleware, apiReference({
  // @ts-ignore - Bypass strict type checking for Scalar configuration
  spec: {
    content: openApiSpec
  },
}));

// Routes
app.route("/api/auth", authApi);
app.route("/api/upload", uploadApi);

// Protected Admin Routes
app.use("/api/accounts", authMiddleware);
app.use("/api/accounts/*", authMiddleware);
app.use("/api/drive", authMiddleware);
app.use("/api/drive/*", authMiddleware);

app.route("/api/accounts", accountsApi);
app.route("/api/drive", driveApi);

// Dynamic Endpoint Routing for API Keys (Moving Target Defense)
// The route suffix rotates every 5 minutes via heartbeat.
// Frontend must call GET /api/auth/route-token to discover the current suffix.
import { isValidRouteToken } from "./lib/heartbeat.js";

app.use("/api/keys/:token", authMiddleware);
app.use("/api/keys/:token/*", authMiddleware);

app.all("/api/keys/:token/*", async (c, next) => {
  const token = c.req.param("token") || "";
  if (!isValidRouteToken(token)) {
    return c.json({ error: "Invalid or expired route token" }, 404);
  }
  await next();
});

app.all("/api/keys/:token", async (c, next) => {
  const token = c.req.param("token") || "";
  if (!isValidRouteToken(token)) {
    return c.json({ error: "Invalid or expired route token" }, 404);
  }
  await next();
});

app.route("/api/keys/:token", apikeysApi);

// Audit Log Endpoint (admin only)
app.get("/api/audit", authMiddleware, async (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(Math.min(limit, 200));
  return c.json({ logs });
});

// Export for Vercel
export default app;

// Start server
const port = parseInt(process.env.PORT || "3000");

async function main() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB Atlas");

    startCleanupJob();
    startHeartbeat();

    // Only run serve() if not on Vercel
    if (!process.env.VERCEL) {
      serve({
        fetch: app.fetch,
        port,
      });
      console.log(`🚀 Server running on http://localhost:${port}`);
    }
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  main();
}
