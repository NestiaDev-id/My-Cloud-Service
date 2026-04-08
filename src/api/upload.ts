import { Hono } from "hono";
import { StorageAccount } from "../models/Account.js";
import { getUploadUrl, getStorageQuota } from "../lib/google.js";
import { invalidateAccountCache } from "../lib/cache.js";

const app = new Hono();

// --- Rate Limiter (In-Memory) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5; // Maksimal 5 upload
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // Per 10 menit

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/upload/init
 * Initialize upload - returns which account to use and resumable upload URL
 *
 * Body:
 * - isPublic: boolean → jika true, upload ke PUBLIC_FOLDER_ID (tanpa API Key, tapi rate limited)
 * - fileName, mimeType, fileSize: wajib
 */
app.post("/init", async (c) => {
  const body = await c.req.json();
  const { fileName, mimeType, fileSize, parentId, preferredAccountId, isPublic } = body;

  // --- Autentikasi berdasarkan mode ---
  if (isPublic) {
    // Public mode: tidak perlu API Key, tapi wajib rate limit
    const publicFolderId = process.env.PUBLIC_FOLDER_ID;
    if (!publicFolderId) {
      return c.json({ error: "Public upload is not configured on this server" }, 503);
    }

    const clientIp = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    if (!checkRateLimit(clientIp)) {
      return c.json(
        { error: "Rate limit exceeded. Coba lagi dalam beberapa menit." },
        429,
      );
    }
  } else {
    // Private mode: wajib API Key
    const apiKey = c.req.header("X-API-Key");
    const serverApiKey = process.env.UPLOAD_API_KEY;
    if (serverApiKey && apiKey !== serverApiKey) {
      return c.json({ error: "Unauthorized: Invalid or missing API Key" }, 401);
    }
  }

  if (!fileName || !mimeType || !fileSize) {
    return c.json(
      { error: "fileName, mimeType, and fileSize are required" },
      400,
    );
  }

  try {
    // Get all active accounts with their storage info
    const accounts = await StorageAccount.find({
      isActive: true,
      status: "connected",
    });

    if (accounts.length === 0) {
      return c.json({ error: "No connected storage accounts available" }, 400);
    }

    // Refresh storage quotas
    const accountsWithSpace = await Promise.all(
      accounts.map(async (account) => {
        try {
          const quota = await getStorageQuota(account.refreshToken);
          account.totalStorage = quota.totalStorage;
          account.usedStorage = quota.usedStorage;
          await account.save();
          return {
            account,
            availableSpace: quota.totalStorage - quota.usedStorage,
          };
        } catch {
          return {
            account,
            availableSpace: account.totalStorage - account.usedStorage,
          };
        }
      }),
    );

    // Filter accounts with enough space
    const suitableAccounts = accountsWithSpace.filter(
      (a) => a.availableSpace >= fileSize,
    );

    if (suitableAccounts.length === 0) {
      return c.json(
        {
          error: "Not enough storage space in any connected account",
          requiredSpace: fileSize,
          accounts: accountsWithSpace.map((a) => ({
            id: a.account._id,
            name: a.account.name,
            availableSpace: a.availableSpace,
          })),
        },
        400,
      );
    }

    // Select account (prefer specified, otherwise most space)
    let selectedAccount = suitableAccounts[0];
    if (preferredAccountId) {
      const preferred = suitableAccounts.find(
        (a) => a.account._id.toString() === preferredAccountId,
      );
      if (preferred) {
        selectedAccount = preferred;
      }
    } else {
      // Sort by available space (most space first)
      suitableAccounts.sort((a, b) => b.availableSpace - a.availableSpace);
      selectedAccount = suitableAccounts[0];
    }

    // Parse parent folder ID if provided, or auto-target based on mode
    let googleParentId: string | undefined;
    const masterFolderId = process.env.MASTER_FOLDER_ID;
    const publicFolderId = process.env.PUBLIC_FOLDER_ID;

    if (parentId) {
      // User specified a specific folder
      const [, folderId] = parentId.split(":");
      googleParentId = folderId;
    } else if (isPublic && publicFolderId) {
      // Public upload → target Public Folder
      googleParentId = publicFolderId;
    } else if (masterFolderId) {
      // Private upload → target Master Folder
      googleParentId = masterFolderId;
    }

    // Get resumable upload URL from Google
    const uploadUrl = await getUploadUrl(
      selectedAccount.account.refreshToken,
      fileName,
      mimeType,
      googleParentId,
    );

    if (!uploadUrl) {
      return c.json(
        { error: "Failed to initialize upload with Google Drive" },
        500,
      );
    }

    return c.json({
      uploadUrl,
      accountId: selectedAccount.account._id.toString(),
      accountName: selectedAccount.account.name,
      availableSpace: selectedAccount.availableSpace,
      expiresIn: 3600, // Upload URL typically valid for 1 hour
    });
  } catch (error) {
    console.error("Error initializing upload:", error);
    return c.json({ error: "Failed to initialize upload" }, 500);
  }
});

/**
 * GET /api/upload/status
 * Get upload capacity status for all accounts
 */
app.get("/status", async (c) => {
  try {
    const accounts = await StorageAccount.find({
      isActive: true,
      status: "connected",
    });

    const status = await Promise.all(
      accounts.map(async (account) => {
        try {
          const quota = await getStorageQuota(account.refreshToken);
          return {
            id: account._id.toString(),
            name: account.name,
            email: account.email,
            totalStorage: quota.totalStorage,
            usedStorage: quota.usedStorage,
            availableSpace: quota.totalStorage - quota.usedStorage,
            percentUsed: Math.round(
              (quota.usedStorage / quota.totalStorage) * 100,
            ),
            status: "connected",
          };
        } catch {
          return {
            id: account._id.toString(),
            name: account.name,
            email: account.email,
            totalStorage: account.totalStorage,
            usedStorage: account.usedStorage,
            availableSpace: account.totalStorage - account.usedStorage,
            percentUsed: Math.round(
              (account.usedStorage / account.totalStorage) * 100,
            ),
            status: "error",
          };
        }
      }),
    );

    const totalCapacity = status.reduce((sum, a) => sum + a.totalStorage, 0);
    const totalUsed = status.reduce((sum, a) => sum + a.usedStorage, 0);

    return c.json({
      accounts: status,
      summary: {
        totalAccounts: accounts.length,
        totalCapacity,
        totalUsed,
        totalAvailable: totalCapacity - totalUsed,
        percentUsed: Math.round((totalUsed / totalCapacity) * 100),
      },
    });
  } catch (error) {
    console.error("Error getting upload status:", error);
    return c.json({ error: "Failed to get upload status" }, 500);
  }
});

/**
 * POST /api/upload/complete
 * Notify backend that upload is complete (for updating storage quota)
 */
app.post("/complete", async (c) => {
  const body = await c.req.json();
  const { accountId, fileSize } = body;

  if (!accountId) {
    return c.json({ error: "accountId is required" }, 400);
  }

  try {
    const account = await StorageAccount.findById(accountId);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Update used storage
    account.usedStorage += fileSize || 0;
    account.lastCheck = new Date();
    await account.save();

    // Invalidate cache so new file appears immediately
    await invalidateAccountCache(accountId);

    return c.json({
      success: true,
      newUsedStorage: account.usedStorage,
    });
  } catch (error) {
    console.error("Error completing upload:", error);
    return c.json({ error: "Failed to complete upload" }, 500);
  }
});

export default app;
