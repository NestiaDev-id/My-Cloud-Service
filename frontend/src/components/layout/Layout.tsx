import { useMemo, useCallback, useEffect, Component, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";

import { Sidebar, Header } from "@/components/layout";
import { FileDetails, BulkActions, ContextMenu } from "@/components/files";
import {
  RenameModal,
  CreateFolderModal,
  UploadModal,
  MoveToModal,
  EditAccountModal,
  AddAccountModal,
} from "@/components/modals";
import { useFileStore, useUploadStore, useUIStore } from "@/stores";
import { useToast } from "@/components/Toast";
import type { Account, CloudFile } from "@/types";

type TabId = "drive" | "monitoring" | "recent" | "shared" | "trash";

interface LayoutProps {
  activeAccount: Account;
  mainAccount: Account | null;
  accounts: Account[];
  onLogout: () => void;
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-2xl border border-red-100 shadow-sm text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Halaman Gagal Dimuat</h3>
          <p className="text-sm text-gray-500 mb-4">{this.state.error?.toString()}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Layout({
  activeAccount,
  mainAccount,
  accounts,
  onLogout,
}: LayoutProps) {
  const { showToast } = useToast();
  const location = useLocation();

  // Determine active tab from URL
  const currentPath = location.pathname;
  const activeTab = (
    currentPath === "/" || currentPath === ""
      ? "drive"
      : currentPath.substring(1).split("/")[0]
  ) as TabId;

  // File store
  const {
    files,
    selectedFileIds,
    searchQuery,
    currentFolderId,
    setSearchQuery,
    setSelectedFileIds,
    setCurrentFolderId,
    getSelectedFile,
    moveToTrash,
    restoreFiles,
    permanentDelete,
    renameFile,
    createFolder,
    moveFiles,
    addFiles,
    handleFolderDoubleClick,
  } = useFileStore();

  // Upload store
  const {
    pendingFiles,
    uploadingFiles,
    isDragging,
    addPendingFiles,
    removePendingFile,
    clearPendingFiles,
    clearUploadingFiles,
    startUpload,
    onDragOver,
    onDragLeave,
    onDrop,
  } = useUploadStore();

  // UI store
  const {
    viewMode,
    setViewMode,
    isAccountMenuOpen,
    toggleAccountMenu,
    closeAccountMenu,
    isRenameModalOpen,
    isCreateFolderModalOpen,
    isUploadModalOpen,
    isEditModalOpen,
    renamingFileId,
    newName,
    movingFileIds,
    editingAccount,
    editForm,
    contextMenu,
    openRenameModal,
    closeRenameModal,
    openCreateFolderModal,
    closeCreateFolderModal,
    openUploadModal,
    closeUploadModal,
    openEditModal,
    closeEditModal,
    openAddAccountModal,
    closeAddAccountModal,
    setNewName,
    setMovingFileIds,
    setEditForm,
    openContextMenu,
    closeContextMenu,
  } = useUIStore();

  const selectedFile = getSelectedFile();

  // Computed storage
  const { totalUsed, totalCapacity } = useMemo(() => {
    return accounts.reduce(
      (acc, current) => ({
        totalUsed: acc.totalUsed + current.usedStorage,
        totalCapacity: acc.totalCapacity + current.totalStorage,
      }),
      { totalUsed: 0, totalCapacity: 0 },
    );
  }, [accounts]);

  // Sync state with URL
  useEffect(() => {
    setCurrentFolderId(null);
    setSelectedFileIds([]);
    closeContextMenu();
  }, [location.pathname, setCurrentFolderId, setSelectedFileIds, closeContextMenu]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      e.preventDefault();
      e.stopPropagation();
      openContextMenu(e.clientX, e.clientY, fileId);
      if (!selectedFileIds.includes(fileId)) {
        setSelectedFileIds([fileId]);
      }
    },
    [selectedFileIds, setSelectedFileIds, openContextMenu],
  );

  const handleRename = useCallback(
    (file: CloudFile) => {
      openRenameModal(file);
    },
    [openRenameModal],
  );

  const handleRenameSubmit = useCallback(() => {
    if (renamingFileId && newName.trim()) {
      renameFile(renamingFileId, newName);
      showToast(`Renamed to ${newName}`, "success");
      closeRenameModal();
    }
  }, [renamingFileId, newName, renameFile, showToast, closeRenameModal]);

  const handleCreateFolderSubmit = useCallback(async () => {
    await createFolder(newName);
    showToast(`Folder "${newName}" created`, "success");
    closeCreateFolderModal();
  }, [createFolder, newName, showToast, closeCreateFolderModal]);

  const handleDownload = useCallback(
    (file: CloudFile) => {
      showToast(`Downloading ${file.name}...`, "info");
      setTimeout(
        () => showToast(`${file.name} downloaded successfully`, "success"),
        2000,
      );
    },
    [showToast],
  );

  const handleShare = useCallback(
    (file: CloudFile) => {
      showToast(`Sharing ${file.name}...`, "info");
    },
    [showToast],
  );

  const handlePreview = useCallback(
    (file: CloudFile) => {
      showToast(`Opening preview for ${file.name}`, "info");
    },
    [showToast],
  );

  const handleMoveToTrash = useCallback(
    (fileIds: string[]) => {
      moveToTrash(fileIds);
      showToast(`${fileIds.length} item(s) moved to trash`, "info");
    },
    [moveToTrash, showToast],
  );

  const handleRestoreFiles = useCallback(
    (fileIds: string[]) => {
      restoreFiles(fileIds);
      showToast(`${fileIds.length} item(s) restored`, "success");
    },
    [restoreFiles, showToast],
  );

  const handlePermanentDelete = useCallback(
    (fileIds: string[]) => {
      permanentDelete(fileIds);
      showToast(`${fileIds.length} item(s) deleted permanently`, "success");
    },
    [permanentDelete, showToast],
  );

  const handleMoveFiles = useCallback(
    (fileIds: string[], targetFolderId: string | null) => {
      if (fileIds.some((id) => id === targetFolderId)) {
        showToast("Cannot move a folder into itself", "error");
        return;
      }
      moveFiles(fileIds, targetFolderId);
      const targetFolder = targetFolderId
        ? files.find((f) => f.id === targetFolderId)
        : { name: "My Drive" };
      showToast(
        `${fileIds.length} item(s) moved to ${targetFolder?.name}`,
        "success",
      );
      setMovingFileIds([]);
    },
    [moveFiles, files, showToast, setMovingFileIds],
  );

  const handleAccountLogout = useCallback(() => {
    onLogout();
    showToast("Signed out of all accounts", "info");
  }, [onLogout, showToast]);

  const handleStartUpload = useCallback(() => {
    startUpload(
      currentFolderId,
      (newFile) => addFiles([newFile]),
      (fileName) => showToast(`${fileName} uploaded successfully!`, "success"),
    );
  }, [currentFolderId, addFiles, showToast, startUpload]);

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans">
      <Sidebar
        onNewClick={openUploadModal}
        totalUsed={totalUsed}
        totalCapacity={totalCapacity}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeAccount={activeAccount}
          mainAccount={mainAccount}
          isAccountMenuOpen={isAccountMenuOpen}
          onAccountMenuToggle={toggleAccountMenu}
          onAccountMenuClose={closeAccountMenu}
          onLogout={handleAccountLogout}
        />

        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div key={location.key} className="h-full">
              <PageErrorBoundary>
                <Outlet
                  context={{
                    accounts,
                    activeAccount,
                    activeTab,
                    onContextMenu: handleContextMenu,
                    onRename: handleRename,
                    onDownload: handleDownload,
                    onShare: handleShare,
                    onMoveToTrash: handleMoveToTrash,
                    onRestoreFiles: handleRestoreFiles,
                    onPermanentDelete: handlePermanentDelete,
                    openEditModal,
                    openAddAccountModal,
                    showToast,
                  }}
                />
              </PageErrorBoundary>
            </div>
          </div>

          {/* Details Panel - only for file pages */}
          <AnimatePresence>
            {selectedFileIds.length > 0 && activeTab !== "monitoring" && (
              <FileDetails
                selectedFileIds={selectedFileIds}
                selectedFile={selectedFile}
                files={files}
                activeAccount={activeAccount}
                isTrashTab={activeTab === "trash"}
                onClose={() => setSelectedFileIds([])}
                onRename={handleRename}
                onMove={setMovingFileIds}
                onDownload={handleDownload}
                onPreview={handlePreview}
                onRestore={handleRestoreFiles}
                onDeletePermanently={handlePermanentDelete}
                onMoveToTrash={handleMoveToTrash}
              />
            )}
          </AnimatePresence>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedFileIds.length > 1 && (
              <BulkActions
                selectedCount={selectedFileIds.length}
                isTrashTab={activeTab === "trash"}
                onMoveToTrash={() => handleMoveToTrash(selectedFileIds)}
                onRestore={() => handleRestoreFiles(selectedFileIds)}
                onDeletePermanently={() => handlePermanentDelete(selectedFileIds)}
                onMoveToFolder={() => setMovingFileIds(selectedFileIds)}
                onClear={() => setSelectedFileIds([])}
              />
            )}
          </AnimatePresence>

          {/* Context Menu */}
          <ContextMenu
            contextMenu={contextMenu}
            files={files}
            selectedFileIds={selectedFileIds}
            isTrashTab={activeTab === "trash"}
            onClose={closeContextMenu}
            onDownload={handleDownload}
            onShare={handleShare}
            onRename={handleRename}
            onMove={setMovingFileIds}
            onViewDetails={(fileId) => setSelectedFileIds([fileId])}
            onMoveToTrash={handleMoveToTrash}
            onOpenFolder={handleFolderDoubleClick}
            onRestore={handleRestoreFiles}
            onDeletePermanently={handlePermanentDelete}
          />
        </div>

        {/* Modals */}
        <RenameModal
          isOpen={isRenameModalOpen}
          onClose={closeRenameModal}
          value={newName}
          onChange={setNewName}
          onSubmit={handleRenameSubmit}
        />

        <CreateFolderModal
          isOpen={isCreateFolderModalOpen}
          onClose={closeCreateFolderModal}
          value={newName}
          onChange={setNewName}
          onSubmit={handleCreateFolderSubmit}
        />

        <UploadModal
          isOpen={isUploadModalOpen}
          pendingFiles={pendingFiles}
          uploadingFiles={uploadingFiles}
          isDragging={isDragging}
          onClose={() => {
            closeUploadModal();
            clearUploadingFiles();
            clearPendingFiles();
          }}
          onCreateFolder={() => {
            closeUploadModal();
            openCreateFolderModal();
          }}
          onFileSelect={addPendingFiles}
          onFolderSelect={addPendingFiles}
          onRemovePending={removePendingFile}
          onClearPending={clearPendingFiles}
          onStartUpload={handleStartUpload}
          onAddMoreFiles={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.onchange = (e) =>
              addPendingFiles((e.target as HTMLInputElement).files);
            input.click();
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onComplete={() => {
            closeUploadModal();
            clearUploadingFiles();
          }}
        />

        <MoveToModal
          isOpen={movingFileIds.length > 0}
          itemCount={movingFileIds.length}
          folders={files}
          movingFileIds={movingFileIds}
          onClose={() => setMovingFileIds([])}
          onMove={(targetFolderId) =>
            handleMoveFiles(movingFileIds, targetFolderId)
          }
        />

        <AddAccountModal />
        <EditAccountModal
          isOpen={isEditModalOpen}
          account={editingAccount}
          formName={editForm.name}
          formEmail={editForm.email}
          onNameChange={(value) => setEditForm({ ...editForm, name: value })}
          onEmailChange={(value) => setEditForm({ ...editForm, email: value })}
          onClose={closeEditModal}
          onSave={() => {
            showToast(`Perubahan untuk ${editForm.name} disimpan`, "success");
            closeEditModal();
          }}
          onDisconnect={() => {
            if (editingAccount) {
              showToast(`Koneksi ${editingAccount.name} diputus.`, "info");
              closeEditModal();
            }
          }}
          onDelete={() => {
            if (editingAccount) {
              showToast(
                `${editingAccount.name} dihapus secara permanen dari sistem.`,
                "error",
              );
              closeEditModal();
            }
          }}
        />
      </main>
    </div>
  );
}
