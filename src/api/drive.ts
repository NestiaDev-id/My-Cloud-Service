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
function transformFile(file: any, accountId: string) {
  return {
    id: `${accountId}:${file.id}`, // Composite ID: accountId:fileId
    driveFileId: file.id,
    name: file.name,
    size: parseInt(file.size || "0"),
    type: getFileType(file.mimeType),
    mimeType: file.mimeType,
    lastModified: file.modifiedTime,
    ownerId: accountId,
    parentId: file.parents?.[0] ? `${accountId}:${file.parents[0]}` : undefined,
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
 * List files from all connected accounts (unified view)
 */
app.get("/files", async (c) => {
  const folderId = c.req.query("folderId");
  const query = c.req.query("q");
  const accountId = c.req.query("accountId"); // Optional: filter by specific account

  try {
    let accounts = await StorageAccount.find({
      isActive: true,
      status: "connected",
    });

    // If accountId specified, filter to that account
    if (accountId) {
      accounts = accounts.filter((a) => a._id.toString() === accountId);
    }

    if (accounts.length === 0) {
      return c.json({ files: [], message: "No connected accounts" });
    }

    // Parse folderId to determine which account's folder to query
    let targetFolderId: string | undefined;
    let targetAccountId: string | undefined;

    if (folderId) {
      const parsed = parseCompositeId(folderId);
      targetAccountId = parsed.accountId;
      targetFolderId = parsed.fileId;
    }

    // Fetch files from all accounts in parallel
    const results = await Promise.allSettled(
      accounts
        .filter(
          (account) =>
            !targetAccountId || account._id.toString() === targetAccountId,
        )
        .map(async (account) => {
          const { files } = await listFiles(account.refreshToken, {
            folderId: targetFolderId,
            query,
          });
          return files.map((file) =>
            transformFile(file, account._id.toString()),
          );
        }),
    );

    // Aggregate results
    const allFiles: any[] = [];
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allFiles.push(...result.value);
      }
    });

    // Sort by lastModified (most recent first)
    allFiles.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    );

    return c.json({ files: allFiles });
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
    return c.json({
      file: transformFile(folder, account._id.toString()),
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
    const results = await Promise.allSettled(
      fileIds.map(async (compositeId: string) => {
        const { accountId, fileId } = parseCompositeId(compositeId);
        const account = await StorageAccount.findById(accountId);
        if (!account) throw new Error("Account not found");
        await trashFile(account.refreshToken, fileId);
        return compositeId;
      }),
    );

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
