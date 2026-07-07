import { Hono } from "hono";
import {
  ApiKey,
  generateApiKey,
  calculateExpiry,
  parseDuration,
} from "../models/ApiKey.js";
import { audit } from "../models/AuditLog.js";
import { canGenerateKey } from "../lib/security.js";

const app = new Hono();

/**
 * GET /api/keys
 * List all API keys (admin only - protected by authMiddleware in index.ts)
 */
app.get("/", async (c) => {
  try {
    const keys = await ApiKey.find().sort({ createdAt: -1 });

    const now = Date.now();

    const result = keys.map((k) => {
      // Reset 24h counter if needed
      if (k.usageTodayResetAt && now > k.usageTodayResetAt.getTime()) {
        k.usageToday = 0;
        k.usageTodayResetAt = new Date(now + 24 * 60 * 60 * 1000);
        k.save().catch(() => {}); // Fire-and-forget
      }

      return {
        id: k._id.toString(),
        name: k.name,
        keyPrefix: k.keyPrefix,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt?.toISOString() || null,
        expiresAt: k.expiresAt?.toISOString() || null,
        isExpired: k.expiresAt ? now > k.expiresAt.getTime() : false,
        usageToday: k.usageToday,
        isActive: k.isActive,
      };
    });

    return c.json({ keys: result });
  } catch (error: any) {
    console.error("Error listing API keys:", error);
    return c.json({ error: "Failed to list API keys" }, 500);
  }
});

/**
 * POST /api/keys
 * Generate a new API key
 *
 * Body:
 * - name: string (label for the key)
 * - duration: "7d" | "14d" | "1m" | "3m" | "1y" | "permanent"
 */
app.post("/", async (c) => {
  try {
    const { name, duration } = await c.req.json();

    if (!name || !duration) {
      return c.json({ error: "name and duration are required" }, 400);
    }

    const validDurations = ["7d", "14d", "1m", "3m", "1y", "permanent"];
    if (!validDurations.includes(duration)) {
      return c.json(
        { error: `Invalid duration. Use one of: ${validDurations.join(", ")}` },
        400,
      );
    }

    // Rate limit key generation (max 3 per hour)
    const clientIp = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "admin";
    if (!canGenerateKey(clientIp)) {
      return c.json({ error: "Rate limit: max 3 keys per hour" }, 429);
    }

    const { raw, hash, prefix } = generateApiKey();
    const expiresAt = calculateExpiry(duration);
    const ttlMs = parseDuration(duration);

    await ApiKey.create({
      name,
      keyHash: hash,
      keyPrefix: prefix,
      expiresAt,
      ttlMs,
    });

    // Return the raw key ONLY ONCE - it cannot be retrieved again
    await audit("KEY_GENERATED", {
      actor: "admin",
      ip: clientIp,
      target: name,
      details: `Duration: ${duration}`,
    });

    return c.json({
      success: true,
      key: {
        name,
        secretKey: raw,
        prefix,
        expiresAt: expiresAt?.toISOString() || null,
        duration,
      },
      warning: "Save this key now. It will not be shown again.",
    });
  } catch (error: any) {
    console.error("Error generating API key:", error);
    return c.json({ error: "Failed to generate API key" }, 500);
  }
});

/**
 * DELETE /api/keys/:id
 * Revoke and delete an API key
 */
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const key = await ApiKey.findByIdAndDelete(id);

    if (!key) {
      return c.json({ error: "API key not found" }, 404);
    }

    await audit("KEY_REVOKED", {
      actor: "admin",
      ip: c.req.header("x-forwarded-for") || "unknown",
      target: key.name,
    });

    return c.json({ success: true, message: `Key "${key.name}" has been revoked.` });
  } catch (error: any) {
    console.error("Error revoking API key:", error);
    return c.json({ error: "Failed to revoke API key" }, 500);
  }
});

export default app;
