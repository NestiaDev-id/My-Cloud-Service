export type FileType = "folder" | "pdf" | "image" | "doc" | "archive" | "other";

export interface CloudFile {
  id: string;
  driveFileId?: string;
  name: string;
  size: number;
  type: FileType;
  mimeType?: string;
  lastModified: string;
  ownerId: string;
  ownerEmail?: string;
  ownerDisplayName?: string;
  itemCount?: number;
  parentId?: string;
  thumbnailUrl?: string;
  isDeleted?: boolean;
  isShared?: boolean;
  webViewLink?: string;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  status: "connected" | "disconnected" | "error";
  lastCheck: string;
  usedStorage: number; // in bytes
  totalStorage: number; // in bytes
  isMainAccount?: boolean;
  isActive?: boolean;
}

export interface UserSession {
  parentAuthenticated: boolean; // Main website authentication
  activeAccountId: string | null; // Storage account being viewed
  mainAccountEmail: string | null;
}
