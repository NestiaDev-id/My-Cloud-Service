import { Hono } from "hono";
import {
  getAuthUrl,
  getTokensFromCode,
  getUserInfo,
  getStorageQuota,
} from "../lib/google.js";
import { StorageAccount, toDTO } from "../models/Account.js";
import { createJWT, verifyJWT } from "../lib/auth.js";
import { encrypt } from "../lib/encryption.js";
import { audit } from "../models/AuditLog.js";

const app = new Hono();

/**
 * GET /api/auth/url
 * Generate OAuth URL for adding a new storage account
 */
app.get("/url", (c) => {
  const name = c.req.query("name");
  // Pass the custom name via the state parameter
  const url = getAuthUrl(name);
  return c.json({ url });
});

/**
 * GET /api/auth/callback
 * Handle OAuth callback from Google
 */
app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state"); // This contains our custom name if provided

  if (!code) {
    return c.json({ error: "Authorization code is required" }, 400);
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return c.json(
        {
          error:
            "No refresh token received. Please revoke access and try again.",
        },
        400,
      );
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.refresh_token);
    const storageQuota = await getStorageQuota(tokens.refresh_token);
    const adminEmail = process.env.ADMIN_EMAIL;
    const clientIp = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    // --- CHECK IF ADMIN ---
    if (adminEmail && userInfo.email?.toLowerCase() === adminEmail.toLowerCase()) {
      console.log(`[Auth] Admin logged in: ${userInfo.email}`);
      
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      
      // Create JWT token instead of static cookie
      const jwtToken = createJWT({
        email: userInfo.email,
        role: "admin",
      });

      c.header(
        "Set-Cookie",
        `admin_token=${jwtToken}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${60 * 60 * 24 * 7}`,
      );

      // Audit log
      await audit("LOGIN_SUCCESS", {
        actor: userInfo.email,
        ip: clientIp,
        details: "Admin login via Google OAuth",
      });

      return c.redirect(`${frontendUrl}/monitoring?login=admin_success`);
    }

    // --- NON-ADMIN: Add as storage account ---

    // Encrypt the refresh token before storing
    const encryptedToken = encrypt(tokens.refresh_token);

    // Check if account already exists
    let account = await StorageAccount.findOne({ email: userInfo.email });

    // Determine name: use state (custom name) if provided, else userInfo.name, else email
    const displayName = state || userInfo.name || userInfo.email || "Unknown";

    if (account) {
      // Update existing account
      account.refreshToken = encryptedToken;
      account.name = displayName;
      account.avatar = userInfo.picture || account.avatar || "";
      account.totalStorage = storageQuota.totalStorage;
      account.usedStorage = storageQuota.usedStorage;
      account.status = "connected";
      account.lastCheck = new Date();
      await account.save();
    } else {
      // Create new account
      const colors = [
        "bg-blue-500",
        "bg-indigo-600",
        "bg-emerald-500",
        "bg-purple-500",
        "bg-pink-500",
        "bg-orange-500",
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      account = new StorageAccount({
        email: userInfo.email,
        name: displayName,
        avatar: userInfo.picture || "",
        color: randomColor,
        refreshToken: encryptedToken,
        totalStorage: storageQuota.totalStorage,
        usedStorage: storageQuota.usedStorage,
        status: "connected",
        lastCheck: new Date(),
        isActive: true,
      });
      await account.save();
    }

    // Audit log
    await audit("ACCOUNT_CONNECTED", {
      actor: userInfo.email || "unknown",
      ip: clientIp,
      target: account._id.toString(),
      details: `Storage account "${displayName}" connected`,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/monitoring?connected=true`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/monitoring?error=auth_failed`);
  }
});

/**
 * GET /api/auth/me
 * Check current admin status (now using JWT verification)
 */
app.get("/me", (c) => {
  const cookie = c.req.header("cookie");
  const adminTokenMatch = cookie?.match(/admin_token=([^;]+)/);

  if (!adminTokenMatch) {
    return c.json({ authenticated: false }, 401);
  }

  const payload = verifyJWT(adminTokenMatch[1]);

  if (!payload || payload.role !== "admin") {
    return c.json({ authenticated: false }, 401);
  }

  return c.json({
    authenticated: true,
    user: {
      email: payload.email,
      role: "admin",
    },
  });
});

/**
 * POST /api/auth/logout
 * Logout admin
 */
app.post("/logout", async (c) => {
  const clientIp = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

  await audit("LOGOUT", { ip: clientIp, details: "Admin logged out" });

  c.header(
    "Set-Cookie",
    "admin_token=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0",
  );
  return c.json({ success: true });
});

export default app;
