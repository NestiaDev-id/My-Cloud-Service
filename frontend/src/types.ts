export type FileType = 'folder' | 'pdf' | 'image' | 'doc' | 'archive' | 'other';

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  type: FileType;
  lastModified: string;
  ownerId: string;
  itemCount?: number;
  parentId?: string;
  thumbnailUrl?: string;
  isDeleted?: boolean;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  status: 'connected' | 'disconnected';
  lastCheck: string;
  usedStorage: number; // in bytes
  totalStorage: number; // in bytes
}

export interface UserSession {
  parentAuthenticated: boolean;
  activeAccountId: string | null;
}
