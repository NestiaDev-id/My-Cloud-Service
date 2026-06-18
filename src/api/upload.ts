import { Hono } from "hono";
import { StorageAccount } from "../models/Account.js";
import { getUploadUrl, getStorageQuota } from "../lib/google.js";
import { cache, invalidateAccountCache } from "../lib/cache.js";
import { FileRecord } from "../models/FileRecord.js";
import { ApiKey, hashApiKey } from "../models/ApiKey.js";

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
    // Private mode: Wajib API Key ATAU Sedang Login sebagai Admin
    const apiKeyHeader = c.req.header("X-API-Key");
    const isAdmin = c.req.header("cookie")?.includes("admin_token=active_admin_session");

    if (isAdmin) {
      // Admin login → permanen, no TTL
      (c as any).uploadTier = "admin";
    } else if (apiKeyHeader) {
      // Collaborator mode → validate key from database
      const keyHash = hashApiKey(apiKeyHeader);
      const apiKeyDoc = await ApiKey.findOne({ keyHash, isActive: true });

      if (!apiKeyDoc) {
        return c.json({ error: "Invalid API Key" }, 403);
      }

      // Check if key has expired
      if (apiKeyDoc.expiresAt && Date.now() > apiKeyDoc.expiresAt.getTime()) {
        return c.json({ error: "API Key has expired" }, 403);
      }

      // Update usage tracking
      const now = Date.now();
      if (now > apiKeyDoc.usageTodayResetAt.getTime()) {
        apiKeyDoc.usageToday = 1;
        apiKeyDoc.usageTodayResetAt = new Date(now + 24 * 60 * 60 * 1000);
      } else {
        apiKeyDoc.usageToday += 1;
      }
      apiKeyDoc.lastUsedAt = new Date();
      await apiKeyDoc.save();

      // Store TTL info for the /complete endpoint
      (c as any).uploadTier = "collaborator";
      (c as any).keyTtlMs = apiKeyDoc.ttlMs;
    } else {
      return c.json({ error: "Unauthorized: Silakan login sebagai admin atau gunakan API Key" }, 401);
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
      accountId: selectedAccount.account._id,
      isPublic: !!isPublic,
      uploadTier: (c as any).uploadTier || (isPublic ? "public" : "admin"),
      keyTtlMs: (c as any).keyTtlMs ?? null,
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
 * Notify backend that upload is complete (for updating storage quota & recording metadata)
 */
app.post("/complete", async (c) => {
  const body = await c.req.json();
  const { accountId, fileSize, fileId, fileName, mimeType, isPublic, uploadTier, keyTtlMs } = body;

  if (!accountId || !fileId) {
    return c.json({ error: "accountId and fileId are required" }, 400);
  }

  try {
    const account = await StorageAccount.findById(accountId);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // 1. Update kuota penyimpanan akun
    account.usedStorage += fileSize || 0;
    account.lastCheck = new Date();
    await account.save();

    // 2. Tentukan TTL berdasarkan tier pengguna
    let expirationTime: Date | undefined;
    let tierLabel: string;

    if (isPublic || uploadTier === "public") {
      // Public → 30 menit
      expirationTime = new Date(Date.now() + 30 * 60 * 1000);
      tierLabel = "Public file recorded (auto-delete in 30m)";
    } else if (uploadTier === "collaborator" && keyTtlMs) {
      // Collaborator → sesuai durasi key
      expirationTime = new Date(Date.now() + keyTtlMs);
      const days = Math.round(keyTtlMs / (24 * 60 * 60 * 1000));
      tierLabel = `Collaborator file recorded (auto-delete in ${days} days)`;
    } else {
      // Admin → permanen (tidak ada expiry)
      expirationTime = undefined;
      tierLabel = "Admin file recorded (permanent)";
    }

    await FileRecord.create({
      fileId,
      name: fileName || "Untitled",
      mimeType: mimeType || "application/octet-stream",
      size: fileSize || 0,
      accountId,
      isPublic: !!isPublic,
      ownerEmail: account.email,
      expireAt: expirationTime,
    });

    // 3. Bersihkan cache dashboard agar file baru langsung muncul
    await cache.invalidate("files:");

    return c.json({
      success: true,
      newUsedStorage: account.usedStorage,
      message: tierLabel,
    });
  } catch (error: any) {
    console.error("Error completing upload:", error);
    return c.json({ error: "Failed to complete upload: " + error.message }, 500);
  }
});

export default app;
