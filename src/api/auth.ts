import { Hono } from "hono";
import {
  getAuthUrl,
  getTokensFromCode,
  getUserInfo,
  getStorageQuota,
} from "../lib/google.js";
import { StorageAccount, toDTO } from "../models/Account.js";

const app = new Hono();

/**
 * GET /api/auth/url
 * Generate OAuth URL for adding a new storage account
 */
app.get("/url", (c) => {
  const url = getAuthUrl();
  return c.json({ url });
});

/**
 * GET /api/auth/callback
 * Handle OAuth callback from Google
 */
app.get("/callback", async (c) => {
  const code = c.req.query("code");

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

    // Check if account already exists
    let account = await StorageAccount.findOne({ email: userInfo.email });

    if (account) {
      // Update existing account
      account.refreshToken = tokens.refresh_token;
      account.name = userInfo.name || userInfo.email || "Unknown";
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
        name: userInfo.name || userInfo.email || "Unknown",
        avatar: userInfo.picture || "",
        color: randomColor,
        refreshToken: tokens.refresh_token,
        totalStorage: storageQuota.totalStorage,
        usedStorage: storageQuota.usedStorage,
        status: "connected",
        lastCheck: new Date(),
        isActive: true,
      });
      await account.save();
    }

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/monitoring?connected=true`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/monitoring?error=auth_failed`);
  }
});

export default app;
