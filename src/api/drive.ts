import { Hono } from "hono";
import { StorageAccount } from "../models/Account.js";
import {
  listFiles,
  getFile,
  createFolder,
  trashFile,
  deleteFile,
  renameFile,
  moveFile,
} from "../lib/google.js";
import {
  cache,
  getCacheKey,
  invalidateFolderCache,
  invalidateAccountCache,
} from "../lib/cache.js";

const app = new Hono();

// Map Google MIME types to our file types
function getFileType(
  mimeType: string,
): "folder" | "pdf" | "image" | "doc" | "archive" | "other" {
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint")
  )
    return "doc";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("archive") ||
    mimeType.includes("compressed")
  )
    return "archive";
  return "other";
}

// Transform Google Drive file to our CloudFile format
function transformFile(file: any, accountId: string, isRoot: boolean = false) {
  return {
    id: `${accountId}:${file.id}`, // Composite ID: accountId:fileId
    driveFileId: file.id,
    name: file.name,
    size: parseInt(file.size || "0"),
    type: getFileType(file.mimeType),
    mimeType: file.mimeType,
    lastModified: file.modifiedTime,
    ownerId: accountId,
    // If it's a root fetch, we set parentId to null so the frontend Unified View displays it
    parentId: isRoot
      ? null
      : file.parents?.[0]
        ? `${accountId}:${file.parents[0]}`
        : null,
    thumbnailUrl: file.thumbnailLink,
    isShared: file.shared || false,
    webViewLink: file.webViewLink,
  };
}

// Parse composite ID
function parseCompositeId(compositeId: string) {
  const [accountId, fileId] = compositeId.split(":");
  return { accountId, fileId };
}

/**
 * GET /api/drive/files
 * List files from all connected accounts (unified view) with caching & pagination
 *
 * Query Parameters:
 * - folderId: Composite ID folder (accountId:fileId)
 * - q: Search query
 * - accountId: Filter by specific account
 * - pageSize: Files per page (default: 50)
 * - pageTokens: JSON encoded map of accountId -> pageToken
 * - refresh: "true" to bypass cache
 *
 * Response:
 * {
 *   files: CloudFile[],
 *   pagination: { hasMore, pageTokens, totalLoaded },
 *   fromCache: boolean
 * }
 */
app.get("/files", async (c) => {
  const folderId = c.req.query("folderId");
  const query = c.req.query("q");
  const accountId = c.req.query("accountId");
  const pageSize = parseInt(c.req.query("pageSize") || "50");
  const pageTokensParam = c.req.query("pageTokens");
  const forceRefresh = c.req.query("refresh") === "true";

  try {
    // 1. Get all active accounts
    let accounts = await StorageAccount.find({
      isActive: true,
      status: "connected",
    });

    if (accountId) {
      accounts = accounts.filter((a) => a._id.toString() === accountId);
    }

    if (accounts.length === 0) {
      return c.json({
        files: [],
        pagination: { hasMore: false, pageTokens: {}, totalLoaded: 0 },
        fromCache: false,
        message: "No connected accounts",
      });
    }

    // 2. Parse page tokens from request
    let pageTokens: Record<string, string | null> = {};
    if (pageTokensParam) {
      try {
        pageTokens = JSON.parse(pageTokensParam);
      } catch {
        // Invalid JSON, start from beginning
      }
    }

    // 3. Parse folderId to determine target account
    let targetFolderId: string | undefined;
    let targetAccountId: string | undefined;

    if (folderId) {
      const parsed = parseCompositeId(folderId);
      targetAccountId = parsed.accountId;
      targetFolderId = parsed.fileId;
    }

    // 4. Calculate page size per account
    const filteredAccounts = accounts.filter(
      (account) =>
        !targetAccountId || account._id.toString() === targetAccountId,
    );
    const pageSizePerAccount = Math.ceil(pageSize / filteredAccounts.length);

    // 5. Fetch from all accounts in parallel (with caching)
    const results = await Promise.allSettled(
      filteredAccounts.map(async (account) => {
        const accId = account._id.toString();
        const currentPageToken = pageTokens[accId] || undefined;

        // Generate cache key
        const cacheKey = getCacheKey({
          accountId: accId,
          folderId: targetFolderId,
          query,
          pageToken: currentPageToken,
        });

        // Check cache (skip if forceRefresh)
        if (!forceRefresh) {
          const cached = cache.get<{
            files: any[];
            nextPageToken: string | null;
            hasMore: boolean;
          }>(cacheKey);

          if (cached) {
            console.log(`[Cache HIT] ${cacheKey} (age: ${cached.age}ms)`);
            return {
              accountId: accId,
              files: cached.data.files.map((f) =>
                transformFile(f, accId, !targetFolderId),
              ),
              nextPageToken: cached.data.nextPageToken,
              hasMore: cached.data.hasMore,
              fromCache: true,
            };
          }
        }

        // Cache MISS - fetch from Google Drive
        console.log(`[Cache MISS] ${cacheKey} - fetching from Google`);
        const result = await listFiles(account.refreshToken, {
          folderId: targetFolderId,
          pageSize: pageSizePerAccount,
          pageToken: currentPageToken,
          query,
        });

        // Store in cache (raw files, before transform)
        cache.set(cacheKey, {
          files: result.files,
          nextPageToken: result.nextPageToken,
          hasMore: result.hasMore,
        });

        return {
          accountId: accId,
          files: result.files.map((f: any) =>
            transformFile(f, accId, !targetFolderId),
          ),
          nextPageToken: result.nextPageToken,
          hasMore: result.hasMore,
          fromCache: false,
        };
      }),
    );

    // 6. Aggregate results
    const allFiles: any[] = [];
    const newPageTokens: Record<string, string | null> = {};
    let anyFromCache = false;
    let hasMore = false;

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allFiles.push(...result.value.files);
        newPageTokens[result.value.accountId] = result.value.nextPageToken;
        if (result.value.fromCache) anyFromCache = true;
        if (result.value.hasMore) hasMore = true;
      } else {
        console.error("Failed to fetch from account:", result.reason);
      }
    });

    // 7. Sort by type (folders first) then by lastModified
    allFiles.sort((a, b) => {
      // Folders first
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      // Then by date
      return (
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    });

    return c.json({
      files: allFiles,
      pagination: {
        hasMore,
        pageTokens: newPageTokens,
        totalLoaded: allFiles.length,
      },
      fromCache: anyFromCache,
    });
  } catch (error) {
    console.error("Error listing files:", error);
    return c.json({ error: "Failed to list files" }, 500);
  }
});

/**
 * GET /api/drive/files/:id
 * Get single file details
 */
app.get("/files/:id", async (c) => {
  const compositeId = c.req.param("id");
  const { accountId, fileId } = parseCompositeId(compositeId);

  try {
    const account = await StorageAccount.findById(accountId);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    const file = await getFile(account.refreshToken, fileId);
    return c.json({ file: transformFile(file, accountId) });
  } catch (error) {
    console.error("Error getting file:", error);
    return c.json({ error: "Failed to get file" }, 500);
  }
});

/**
 * POST /api/drive/folders
 * Create a new folder
 */
app.post("/folders", async (c) => {
  const body = await c.req.json();
  const { name, parentId, accountId } = body;

  if (!name) {
    return c.json({ error: "Folder name is required" }, 400);
  }

  try {
    let targetAccountId = accountId;
    let targetParentId: string | undefined;

    // If parentId is specified, extract account from it
    if (parentId) {
      const parsed = parseCompositeId(parentId);
      targetAccountId = parsed.accountId;
      targetParentId = parsed.fileId;
    }

    // If no accountId, pick the account with most available space
    let account;
    if (!targetAccountId) {
      const accounts = await StorageAccount.find({
        isActive: true,
        status: "connected",
      });
      account = accounts.sort(
        (a, b) =>
          b.totalStorage - b.usedStorage - (a.totalStorage - a.usedStorage),
      )[0];
    } else {
      account = await StorageAccount.findById(targetAccountId);
    }

    if (!account) {
      return c.json({ error: "No available storage account" }, 400);
    }

    const folder = await createFolder(
      account.refreshToken,
      name,
      targetParentId,
    );

    // Invalidate cache for parent folder
    invalidateFolderCache(account._id.toString(), targetParentId || "root");

    return c.json({
      file: transformFile(folder, account._id.toString(), !targetParentId),
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    return c.json({ error: "Failed to create folder" }, 500);
  }
});

/**
 * PATCH /api/drive/files/:id
 * Update file (rename)
 */
app.patch("/files/:id", async (c) => {
  const compositeId = c.req.param("id");
  const { accountId, fileId } = parseCompositeId(compositeId);
  const body = await c.req.json();

  try {
    const account = await StorageAccount.findById(accountId);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    if (body.name) {
      const updated = await renameFile(account.refreshToken, fileId, body.name);

      // Invalidate cache for the folder containing this file
      invalidateAccountCache(accountId);

      return c.json({ file: transformFile(updated, accountId) });
    }

    return c.json({ error: "No changes specified" }, 400);
  } catch (error) {
    console.error("Error updating file:", error);
    return c.json({ error: "Failed to update file" }, 500);
  }
});

/**
 * POST /api/drive/files/:id/move
 * Move file to another folder
 */
app.post("/files/:id/move", async (c) => {
  const compositeId = c.req.param("id");
  const { accountId, fileId } = parseCompositeId(compositeId);
  const body = await c.req.json();
  const { targetFolderId } = body;

  try {
    const account = await StorageAccount.findById(accountId);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Parse target folder ID
    let targetId = "root";
    if (targetFolderId) {
      const parsed = parseCompositeId(targetFolderId);
      // Moving across accounts is not supported
      if (parsed.accountId !== accountId) {
        return c.json(
          { error: "Moving files across accounts is not supported" },
          400,
        );
      }
      targetId = parsed.fileId;
    }

    const moved = await moveFile(account.refreshToken, fileId, targetId);

    // Invalidate cache for both source and target folders
    invalidateAccountCache(accountId);

    return c.json({ file: transformFile(moved, accountId) });
  } catch (error) {
    console.error("Error moving file:", error);
    return c.json({ error: "Failed to move file" }, 500);
  }
});

/**
 * POST /api/drive/files/:id/trash
 * Move file to trash
 */
app.post("/files/:id/trash", async (c) => {
  const compositeId = c.req.param("id");
  const { accountId, fileId } = parseCompositeId(compositeId);

  try {
    const account = await StorageAccount.findById(accountId);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    await trashFile(account.refreshToken, fileId);

    // Invalidate cache
    invalidateAccountCache(accountId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error trashing file:", error);
    return c.json({ error: "Failed to trash file" }, 500);
  }
});

/**
 * DELETE /api/drive/files/:id
 * Permanently delete file
 */
app.delete("/files/:id", async (c) => {
  const compositeId = c.req.param("id");
  const { accountId, fileId } = parseCompositeId(compositeId);

  try {
    const account = await StorageAccount.findById(accountId);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    await deleteFile(account.refreshToken, fileId);

    // Invalidate cache
    invalidateAccountCache(accountId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

/**
 * POST /api/drive/files/bulk-trash
 * Move multiple files to trash
 */
app.post("/files/bulk-trash", async (c) => {
  const body = await c.req.json();
  const { fileIds } = body;

  if (!fileIds || !Array.isArray(fileIds)) {
    return c.json({ error: "fileIds array is required" }, 400);
  }

  try {
    const accountsToInvalidate = new Set<string>();

    const results = await Promise.allSettled(
      fileIds.map(async (compositeId: string) => {
        const { accountId, fileId } = parseCompositeId(compositeId);
        const account = await StorageAccount.findById(accountId);
        if (!account) throw new Error("Account not found");
        await trashFile(account.refreshToken, fileId);
        accountsToInvalidate.add(accountId);
        return compositeId;
      }),
    );

    // Invalidate cache for all affected accounts
    accountsToInvalidate.forEach((accId) => {
      invalidateAccountCache(accId);
    });

    const succeeded = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<string>).value);
    const failed = results
      .filter((r) => r.status === "rejected")
      .map((_, i) => fileIds[i]);

    return c.json({ succeeded, failed });
  } catch (error) {
    console.error("Error bulk trashing files:", error);
    return c.json({ error: "Failed to trash files" }, 500);
  }
});

export default app;
