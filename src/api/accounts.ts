import { Hono } from "hono";
import { StorageAccount, toDTO } from "../models/Account.js";
import { getStorageQuota } from "../lib/google.js";
import { FileCache } from "../models/FileCache.js";

const app = new Hono();

/**
 * GET /api/accounts
 * List all storage accounts
 */
app.get("/", async (c) => {
  try {
    const accounts = await StorageAccount.find({ isActive: true });
    return c.json({
      accounts: accounts.map(toDTO),
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return c.json({ error: "Failed to fetch accounts" }, 500);
  }
});

/**
 * GET /api/accounts/:id
 * Get a single storage account
 */
app.get("/:id", async (c) => {
  try {
    const account = await StorageAccount.findById(c.req.param("id"));
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    return c.json({ account: toDTO(account) });
  } catch (error) {
    console.error("Error fetching account:", error);
    return c.json({ error: "Failed to fetch account" }, 500);
  }
});

/**
 * PATCH /api/accounts/:id
 * Update account details
 */
app.patch("/:id", async (c) => {
  try {
    const body = await c.req.json();
    const { name, color, isActive } = body;

    const account = await StorageAccount.findById(c.req.param("id"));
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    if (name !== undefined) account.name = name;
    if (color !== undefined) account.color = color;
    if (isActive !== undefined) account.isActive = isActive;

    await account.save();
    return c.json({ account: toDTO(account) });
  } catch (error) {
    console.error("Error updating account:", error);
    return c.json({ error: "Failed to update account" }, 500);
  }
});

/**
 * DELETE /api/accounts/:id
 * Remove storage account (soft delete - just deactivate)
 */
app.delete("/:id", async (c) => {
  try {
    const account = await StorageAccount.findById(c.req.param("id"));
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    account.isActive = false;
    account.status = "disconnected";
    await account.save();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

/**
 * POST /api/accounts/:id/refresh
 * Refresh storage quota for an account
 */
app.post("/:id/refresh", async (c) => {
  try {
    const account = await StorageAccount.findById(c.req.param("id"));
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    try {
      const quota = await getStorageQuota(account.refreshToken);
      account.totalStorage = quota.totalStorage;
      account.usedStorage = quota.usedStorage;
      account.status = "connected";
      account.lastCheck = new Date();
      await account.save();

      return c.json({ account: toDTO(account) });
    } catch (googleError) {
      account.status = "error";
      await account.save();
      return c.json({ error: "Failed to connect to Google Drive" }, 502);
    }
  } catch (error) {
    console.error("Error refreshing account:", error);
    return c.json({ error: "Failed to refresh account" }, 500);
  }
});

/**
 * POST /api/accounts/refresh-all
 * Refresh storage quota for all accounts
 */
app.post("/refresh-all", async (c) => {
  try {
    // Clear all file metadata caches to force fresh fetch from Google
    await FileCache.deleteMany({});

    const accounts = await StorageAccount.find({ isActive: true });

    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const quota = await getStorageQuota(account.refreshToken);
          account.totalStorage = quota.totalStorage;
          account.usedStorage = quota.usedStorage;
          account.status = "connected";
          account.lastCheck = new Date();
          await account.save();
          return { id: account._id, status: "success" };
        } catch {
          account.status = "error";
          await account.save();
          return { id: account._id, status: "error" };
        }
      }),
    );

    const updatedAccounts = await StorageAccount.find({ isActive: true });
    return c.json({
      accounts: updatedAccounts.map(toDTO),
      results,
    });
  } catch (error) {
    console.error("Error refreshing accounts:", error);
    return c.json({ error: "Failed to refresh accounts" }, 500);
  }
});

export default app;
