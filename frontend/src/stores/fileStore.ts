import { create } from "zustand";
import type { CloudFile } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type TabId = "drive" | "monitoring" | "recent" | "shared" | "trash";

interface PaginationState {
  hasMore: boolean;
  pageTokens: Record<string, string | null>;
  totalLoaded: number;
}

interface FileState {
  files: CloudFile[];
  selectedFileIds: string[];
  currentFolderId: string | null;
  sortField: "name" | "size" | "lastModified";
  sortDirection: "asc" | "desc";
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Pagination state
  pagination: PaginationState;

  // Computed
  getSelectedFile: () => CloudFile | undefined;
  getBreadcrumbs: () => CloudFile[];
  getProcessedFiles: (activeTab: TabId) => CloudFile[];

  // Actions
  setSearchQuery: (query: string) => void;
  setCurrentFolderId: (id: string | null) => void;
  setSelectedFileIds: (ids: string[]) => void;
  toggleFileSelection: (fileId: string, isMulti: boolean) => void;
  handleFolderDoubleClick: (file: CloudFile) => void;
  handleSort: (field: "name" | "size" | "lastModified") => void;

  // API Actions
  fetchFiles: (folderId?: string | null, mode?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  moveToTrash: (fileIds: string[]) => Promise<void>;
  restoreFiles: (fileIds: string[]) => Promise<void>;
  permanentDelete: (fileIds: string[]) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  createFolder: (folderName: string, parentId?: string | null) => Promise<void>;
  moveFiles: (
    fileIds: string[],
    targetFolderId: string | null,
  ) => Promise<void>;
  addFiles: (newFiles: CloudFile[]) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  selectedFileIds: [],
  currentFolderId: null,
  sortField: "lastModified",
  sortDirection: "desc",
  searchQuery: "",
  isLoading: false,
  isLoadingMore: false,
  error: null,
  pagination: {
    hasMore: false,
    pageTokens: {},
    totalLoaded: 0,
  },

  getSelectedFile: () => {
    const { files, selectedFileIds } = get();
    return files.find((f) => f.id === selectedFileIds[0]);
  },

  getBreadcrumbs: () => {
    const { files, currentFolderId } = get();
    const crumbs: CloudFile[] = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = files.find((f) => f.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId || null;
      } else {
        break;
      }
    }
    return crumbs;
  },

  getProcessedFiles: (activeTab: TabId) => {
    const { files, searchQuery, sortField, sortDirection, currentFolderId } =
      get();

    let result = files.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (activeTab === "trash") {
      result = result.filter((f) => f.isDeleted);
    } else if (activeTab === "recent") {
      result = result.filter((f) => !f.isDeleted && f.type !== "folder");
      result.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime(),
      );
      return result.slice(0, 20);
    } else if (activeTab === "shared") {
      result = result.filter((f) => !f.isDeleted && f.isShared);
    } else if (activeTab === "drive") {
      result = result.filter(
        (f) => !f.isDeleted && (!f.parentId || f.parentId === currentFolderId),
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "size") {
        comparison = a.size - b.size;
      } else if (sortField === "lastModified") {
        comparison =
          new Date(a.lastModified).getTime() -
          new Date(b.lastModified).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
  setSelectedFileIds: (ids) => set({ selectedFileIds: ids }),

  toggleFileSelection: (fileId, isMulti) => {
    set((state) => {
      if (isMulti) {
        return {
          selectedFileIds: state.selectedFileIds.includes(fileId)
            ? state.selectedFileIds.filter((id) => id !== fileId)
            : [...state.selectedFileIds, fileId],
        };
      }
      return { selectedFileIds: [fileId] };
    });
  },

  handleFolderDoubleClick: (file) => {
    if (file.type === "folder" && !file.isDeleted) {
      set({ currentFolderId: file.id, selectedFileIds: [] });
      get().fetchFiles(file.id);
    }
  },

  handleSort: (field) => {
    set((state) => {
      if (state.sortField === field) {
        return {
          sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
        };
      }
      return { sortField: field, sortDirection: "asc" };
    });
  },

  // API Actions

  /**
   * Fetch files (initial load atau saat navigasi folder)
   * Reset pagination state
   */
  fetchFiles: async (folderId?: string | null, mode?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (folderId) params.append("folderId", folderId);
      if (mode) params.append("mode", mode);
      params.append("pageSize", "50");

      const response = await fetch(`${API_URL}/api/drive/files?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();

      set({
        files: data.files,
        pagination: data.pagination || {
          hasMore: false,
          pageTokens: {},
          totalLoaded: data.files.length,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  /**
   * Load more files (untuk infinite scroll)
   * Append ke files yang sudah ada
   */
  loadMore: async () => {
    const { pagination, currentFolderId, files, isLoadingMore } = get();

    // Jangan load jika tidak ada lagi atau sedang loading
    if (!pagination.hasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.append("folderId", currentFolderId);
      params.append("pageSize", "50");
      params.append("pageTokens", JSON.stringify(pagination.pageTokens));

      const response = await fetch(`${API_URL}/api/drive/files?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load more files");

      const data = await response.json();

      // APPEND files, bukan replace
      set({
        files: [...files, ...data.files],
        pagination: data.pagination || {
          hasMore: false,
          pageTokens: {},
          totalLoaded: files.length + data.files.length,
        },
        isLoadingMore: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingMore: false });
    }
  },

  /**
   * Force refresh (bypass cache)
   */
  refreshFiles: async () => {
    const { currentFolderId } = get();
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.append("folderId", currentFolderId);
      params.append("pageSize", "50");
      params.append("refresh", "true"); // Bypass cache

      const response = await fetch(`${API_URL}/api/drive/files?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to refresh files");

      const data = await response.json();

      set({
        files: data.files,
        pagination: data.pagination || {
          hasMore: false,
          pageTokens: {},
          totalLoaded: data.files.length,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  moveToTrash: async (fileIds) => {
    try {
      const response = await fetch(`${API_URL}/api/drive/files/bulk-trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileIds }),
      });
      if (!response.ok) throw new Error("Failed to move to trash");

      // Update local state
      set((state) => ({
        files: state.files.map((f) =>
          fileIds.includes(f.id) ? { ...f, isDeleted: true } : f,
        ),
        selectedFileIds: [],
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  restoreFiles: async (fileIds) => {
    try {
      // For now, just update local state
      // TODO: Add restore API endpoint
      set((state) => ({
        files: state.files.map((f) =>
          fileIds.includes(f.id) ? { ...f, isDeleted: false } : f,
        ),
        selectedFileIds: [],
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  permanentDelete: async (fileIds) => {
    try {
      await Promise.all(
        fileIds.map((fileId) =>
          fetch(`${API_URL}/api/drive/files/${fileId}`, {
            method: "DELETE",
            credentials: "include",
          }),
        ),
      );
      set((state) => ({
        files: state.files.filter((f) => !fileIds.includes(f.id)),
        selectedFileIds: [],
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  renameFile: async (fileId, newName) => {
    if (!newName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/drive/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!response.ok) throw new Error("Failed to rename file");
      const data = await response.json();

      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? data.file : f)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createFolder: async (folderName, parentId) => {
    if (!folderName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/drive/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: parentId || get().currentFolderId,
        }),
      });
      if (!response.ok) throw new Error("Failed to create folder");
      const data = await response.json();

      set((state) => ({ files: [data.file, ...state.files] }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  moveFiles: async (fileIds, targetFolderId) => {
    if (fileIds.some((id) => id === targetFolderId)) {
      return; // Cannot move folder into itself
    }
    try {
      await Promise.all(
        fileIds.map((fileId) =>
          fetch(`${API_URL}/api/drive/files/${fileId}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ targetFolderId }),
          }),
        ),
      );

      set((state) => ({
        files: state.files.map((f) =>
          fileIds.includes(f.id)
            ? { ...f, parentId: targetFolderId || undefined }
            : f,
        ),
        selectedFileIds: [],
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addFiles: (newFiles) => {
    set((state) => ({ files: [...newFiles, ...state.files] }));
  },
}));
