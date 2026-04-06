import { create } from "zustand";
import type { CloudFile, Account } from "@/types";

const INITIAL_FILES: CloudFile[] = [
  {
    id: "1",
    name: "Project Roadmap.pdf",
    size: 2400000,
    type: "pdf",
    lastModified: "2024-03-20T10:30:00Z",
    ownerId: "acc_a",
    thumbnailUrl: "https://picsum.photos/seed/pdf/400/400",
    isShared: true,
  },
  {
    id: "2",
    name: "Design Assets",
    size: 0,
    type: "folder",
    lastModified: "2024-03-19T15:45:00Z",
    ownerId: "acc_a",
    itemCount: 24,
  },
  {
    id: "3",
    name: "Vacation Photos",
    size: 0,
    type: "folder",
    lastModified: "2024-03-18T09:12:00Z",
    ownerId: "acc_b",
    itemCount: 156,
  },
  {
    id: "4",
    name: "Budget_2024.xlsx",
    size: 1200000,
    type: "doc",
    lastModified: "2024-03-21T14:20:00Z",
    ownerId: "acc_b",
    thumbnailUrl: "https://picsum.photos/seed/doc/400/400",
    isShared: true,
  },
  {
    id: "5",
    name: "profile-pic.jpg",
    size: 850000,
    type: "image",
    lastModified: "2024-03-15T11:00:00Z",
    ownerId: "acc_c",
    thumbnailUrl: "https://picsum.photos/seed/profile/400/400",
    isShared: true,
  },
  {
    id: "6",
    name: "source-code.zip",
    size: 15600000,
    type: "archive",
    lastModified: "2024-03-22T16:40:00Z",
    ownerId: "acc_c",
  },
  {
    id: "7",
    name: "Logo_Final.png",
    size: 450000,
    type: "image",
    lastModified: "2024-03-23T10:00:00Z",
    ownerId: "acc_a",
    parentId: "2",
    thumbnailUrl: "https://picsum.photos/seed/logo/400/400",
  },
  {
    id: "8",
    name: "Brand_Guidelines.pdf",
    size: 5600000,
    type: "pdf",
    lastModified: "2024-03-23T11:30:00Z",
    ownerId: "acc_a",
    parentId: "2",
    thumbnailUrl: "https://picsum.photos/seed/brand/400/400",
  },
  {
    id: "9",
    name: "Beach.jpg",
    size: 1200000,
    type: "image",
    lastModified: "2024-03-24T14:00:00Z",
    ownerId: "acc_b",
    parentId: "3",
    thumbnailUrl: "https://picsum.photos/seed/beach/400/400",
  },
];

export type TabId = "drive" | "monitoring" | "recent" | "shared" | "trash";

interface FileState {
  files: CloudFile[];
  selectedFileIds: string[];
  currentFolderId: string | null;
  sortField: "name" | "size" | "lastModified";
  sortDirection: "asc" | "desc";
  searchQuery: string;

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

  // File operations
  moveToTrash: (fileIds: string[]) => void;
  restoreFiles: (fileIds: string[]) => void;
  permanentDelete: (fileIds: string[]) => void;
  renameFile: (fileId: string, newName: string) => void;
  createFolder: (folderName: string, accounts: Account[]) => void;
  moveFiles: (fileIds: string[], targetFolderId: string | null) => void;
  addFiles: (newFiles: CloudFile[]) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: INITIAL_FILES,
  selectedFileIds: [],
  currentFolderId: null,
  sortField: "lastModified",
  sortDirection: "desc",
  searchQuery: "",

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
        (f) => !f.isDeleted && f.parentId === (currentFolderId || undefined),
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

  moveToTrash: (fileIds) => {
    set((state) => ({
      files: state.files.map((f) =>
        fileIds.includes(f.id) ? { ...f, isDeleted: true } : f,
      ),
      selectedFileIds: [],
    }));
  },

  restoreFiles: (fileIds) => {
    set((state) => ({
      files: state.files.map((f) =>
        fileIds.includes(f.id) ? { ...f, isDeleted: false } : f,
      ),
      selectedFileIds: [],
    }));
  },

  permanentDelete: (fileIds) => {
    set((state) => ({
      files: state.files.filter((f) => !fileIds.includes(f.id)),
      selectedFileIds: [],
    }));
  },

  renameFile: (fileId, newName) => {
    if (!newName.trim()) return;
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId
          ? {
              ...f,
              name: newName.trim(),
              lastModified: new Date().toISOString(),
            }
          : f,
      ),
    }));
  },

  createFolder: (folderName, accounts) => {
    if (!folderName.trim()) return;
    const { currentFolderId } = get();
    const newFolder: CloudFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: folderName.trim(),
      size: 0,
      type: "folder",
      lastModified: new Date().toISOString(),
      ownerId: accounts[Math.floor(Math.random() * accounts.length)].id,
      parentId: currentFolderId || undefined,
      itemCount: 0,
    };
    set((state) => ({ files: [newFolder, ...state.files] }));
  },

  moveFiles: (fileIds, targetFolderId) => {
    if (fileIds.some((id) => id === targetFolderId)) {
      return; // Cannot move folder into itself
    }
    set((state) => ({
      files: state.files.map((f) =>
        fileIds.includes(f.id)
          ? {
              ...f,
              parentId: targetFolderId || undefined,
              lastModified: new Date().toISOString(),
            }
          : f,
      ),
      selectedFileIds: [],
    }));
  },

  addFiles: (newFiles) => {
    set((state) => ({ files: [...newFiles, ...state.files] }));
  },
}));
