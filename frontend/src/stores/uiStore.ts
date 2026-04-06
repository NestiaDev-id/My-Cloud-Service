import { create } from "zustand";
import type { CloudFile, Account } from "@/types";

interface UIState {
  // View
  viewMode: "grid" | "list";
  isAccountMenuOpen: boolean;
  isSortMenuOpen: boolean;
  isRefreshing: boolean;

  // Modals
  isRenameModalOpen: boolean;
  isCreateFolderModalOpen: boolean;
  isUploadModalOpen: boolean;
  isEditModalOpen: boolean;

  // Modal data
  renamingFileId: string | null;
  newName: string;
  movingFileIds: string[];
  editingAccount: Account | null;
  editForm: { name: string; email: string };
  contextMenu: { x: number; y: number; fileId: string } | null;

  // Actions
  setViewMode: (mode: "grid" | "list") => void;
  toggleAccountMenu: () => void;
  closeAccountMenu: () => void;
  toggleSortMenu: () => void;
  closeSortMenu: () => void;
  setIsRefreshing: (value: boolean) => void;

  // Modal actions
  openRenameModal: (file: CloudFile) => void;
  closeRenameModal: () => void;
  openCreateFolderModal: () => void;
  closeCreateFolderModal: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  openEditModal: (account: Account) => void;
  closeEditModal: () => void;

  setNewName: (name: string) => void;
  setMovingFileIds: (ids: string[]) => void;
  setEditForm: (form: { name: string; email: string }) => void;

  // Context menu
  openContextMenu: (x: number, y: number, fileId: string) => void;
  closeContextMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: "list",
  isAccountMenuOpen: false,
  isSortMenuOpen: false,
  isRefreshing: false,

  isRenameModalOpen: false,
  isCreateFolderModalOpen: false,
  isUploadModalOpen: false,
  isEditModalOpen: false,

  renamingFileId: null,
  newName: "",
  movingFileIds: [],
  editingAccount: null,
  editForm: { name: "", email: "" },
  contextMenu: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleAccountMenu: () =>
    set((state) => ({ isAccountMenuOpen: !state.isAccountMenuOpen })),
  closeAccountMenu: () => set({ isAccountMenuOpen: false }),
  toggleSortMenu: () =>
    set((state) => ({ isSortMenuOpen: !state.isSortMenuOpen })),
  closeSortMenu: () => set({ isSortMenuOpen: false }),
  setIsRefreshing: (value) => set({ isRefreshing: value }),

  openRenameModal: (file) =>
    set({
      isRenameModalOpen: true,
      renamingFileId: file.id,
      newName: file.name,
    }),
  closeRenameModal: () =>
    set({
      isRenameModalOpen: false,
      renamingFileId: null,
      newName: "",
    }),

  openCreateFolderModal: () =>
    set({ isCreateFolderModalOpen: true, newName: "" }),
  closeCreateFolderModal: () =>
    set({ isCreateFolderModalOpen: false, newName: "" }),

  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),

  openEditModal: (account) =>
    set({
      isEditModalOpen: true,
      editingAccount: account,
      editForm: { name: account.name, email: account.email },
    }),
  closeEditModal: () =>
    set({
      isEditModalOpen: false,
      editingAccount: null,
    }),

  setNewName: (name) => set({ newName: name }),
  setMovingFileIds: (ids) => set({ movingFileIds: ids }),
  setEditForm: (form) => set({ editForm: form }),

  openContextMenu: (x, y, fileId) => set({ contextMenu: { x, y, fileId } }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
