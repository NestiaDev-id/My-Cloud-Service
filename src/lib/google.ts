import { google, drive_v3 } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

/**
 * Generate OAuth2 authorization URL for adding a new storage account
 */
export function getAuthUrl(state?: string): string {
  const scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force to get refresh token
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get Drive client for a specific account using its refresh token
 */
export function getDriveClient(refreshToken: string): drive_v3.Drive {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  client.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth: client });
}

/**
 * Get user info from refresh token
 */
export async function getUserInfo(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  client.setCredentials({ refresh_token: refreshToken });

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();

  return data;
}

/**
 * Get storage quota for an account
 */
export async function getStorageQuota(refreshToken: string) {
  const drive = getDriveClient(refreshToken);
  const { data } = await drive.about.get({
    fields: "storageQuota",
  });

  return {
    totalStorage: parseInt(data.storageQuota?.limit || "0"),
    usedStorage: parseInt(data.storageQuota?.usage || "0"),
  };
}

/**
 * List files from a Drive account
 */
export async function listFiles(
  refreshToken: string,
  options: {
    folderId?: string;
    pageSize?: number;
    pageToken?: string;
    query?: string;
  } = {},
) {
  const drive = getDriveClient(refreshToken);

  let q = "trashed = false";
  if (options.folderId) {
    q += ` and '${options.folderId}' in parents`;
  } else {
    q += " and 'root' in parents";
  }
  if (options.query) {
    q += ` and name contains '${options.query}'`;
  }

  const { data } = await drive.files.list({
    q,
    pageSize: options.pageSize || 100,
    pageToken: options.pageToken,
    fields:
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, parents, shared, webViewLink)",
  });

  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Get file metadata
 */
export async function getFile(refreshToken: string, fileId: string) {
  const drive = getDriveClient(refreshToken);
  const { data } = await drive.files.get({
    fileId,
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, parents, shared, webViewLink, description",
  });
  return data;
}

/**
 * Create a folder
 */
export async function createFolder(
  refreshToken: string,
  name: string,
  parentId?: string,
) {
  const drive = getDriveClient(refreshToken);
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id, name, mimeType, modifiedTime",
  });
  return data;
}

/**
 * Delete file (move to trash)
 */
export async function trashFile(refreshToken: string, fileId: string) {
  const drive = getDriveClient(refreshToken);
  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
  });
}

/**
 * Permanently delete file
 */
export async function deleteFile(refreshToken: string, fileId: string) {
  const drive = getDriveClient(refreshToken);
  await drive.files.delete({ fileId });
}

/**
 * Rename file
 */
export async function renameFile(
  refreshToken: string,
  fileId: string,
  newName: string,
) {
  const drive = getDriveClient(refreshToken);
  const { data } = await drive.files.update({
    fileId,
    requestBody: { name: newName },
    fields: "id, name, modifiedTime",
  });
  return data;
}

/**
 * Move file to another folder
 */
export async function moveFile(
  refreshToken: string,
  fileId: string,
  targetFolderId: string,
) {
  const drive = getDriveClient(refreshToken);
  const file = await drive.files.get({
    fileId,
    fields: "parents",
  });

  const previousParents = file.data.parents?.join(",") || "";

  const { data } = await drive.files.update({
    fileId,
    addParents: targetFolderId,
    removeParents: previousParents,
    fields: "id, name, parents, modifiedTime",
  });
  return data;
}

/**
 * Generate resumable upload URL
 */
export async function getUploadUrl(
  refreshToken: string,
  fileName: string,
  mimeType: string,
  parentId?: string,
) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: refreshToken });

  const accessToken = await client.getAccessToken();

  const metadata = {
    name: fileName,
    parents: parentId ? [parentId] : undefined,
  };

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
      },
      body: JSON.stringify(metadata),
    },
  );

  const uploadUrl = response.headers.get("Location");
  return uploadUrl;
}
