import React, { useState, useMemo, useCallback } from "react";
import { AnimatePresence } from "motion/react";

import { Sidebar, Header } from "@/components/layout";
import {
  FileBrowser,
  FileDetails,
  BulkActions,
  ContextMenu,
} from "@/components/files";
import { MonitoringView } from "@/components/monitoring";
import {
  RenameModal,
  CreateFolderModal,
  UploadModal,
  MoveToModal,
  EditAccountModal,
} from "@/components/modals";
import { useFiles, useUpload } from "@/hooks";
import { useToast } from "@/components/Toast";
import type { Account, CloudFile } from "@/types";

interface DashboardProps {
  activeAccount: Account;
  mainAccount: Account | null;
  accounts: Account[];
  onLogout: () => void;
}

type TabId = "drive" | "monitoring" | "recent" | "shared" | "trash";

export default function Dashboard({
  activeAccount,
  mainAccount,
  accounts,
  onLogout,
}: DashboardProps) {
  const { showToast } = useToast();

  // View state
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeTab, setActiveTab] = useState<TabId>("drive");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [movingFileIds, setMovingFileIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fileId: string;
  } | null>(null);

  // Hooks
  const {
    files,
    selectedFileIds,
    selectedFile,
    currentFolderId,
    breadcrumbs,
    sortField,
    sortDirection,
    searchQuery,
    setSearchQuery,
    setCurrentFolderId,
    setSelectedFileIds,
    getProcessedFiles,
    handleFolderDoubleClick,
    toggleFileSelection,
    handleMoveToTrash,
    handleRestoreFiles,
    handlePermanentDelete,
    handleRenameFile,
    handleCreateFolder,
    handleMoveFiles,
    addFiles,
    handleSort,
  } = useFiles({ accounts, onToast: showToast });

  const {
    pendingFiles,
    uploadingFiles,
    isDragging,
    handleSelectFiles,
    removePendingFile,
    clearPendingFiles,
    startUpload,
    clearUploadingFiles,
    onDragOver,
    onDragLeave,
    onDrop,
  } = useUpload({
    accounts,
    currentFolderId,
    onToast: showToast,
    onFilesAdded: addFiles,
  });

  // Computed values
  const { totalUsed, totalCapacity } = useMemo(() => {
    return accounts.reduce(
      (acc, current) => ({
        totalUsed: acc.totalUsed + current.usedStorage,
        totalCapacity: acc.totalCapacity + current.totalStorage,
      }),
      { totalUsed: 0, totalCapacity: 0 },
    );
  }, [accounts]);

  const processedFiles = useMemo(
    () => getProcessedFiles(activeTab),
    [getProcessedFiles, activeTab],
  );

  // Handlers
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      setCurrentFolderId(null);
      setSelectedFileIds([]);
    },
    [setCurrentFolderId, setSelectedFileIds],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, fileId });
      if (!selectedFileIds.includes(fileId)) {
        setSelectedFileIds([fileId]);
      }
    },
    [selectedFileIds, setSelectedFileIds],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleRename = useCallback((file: CloudFile) => {
    setRenamingFileId(file.id);
    setNewName(file.name);
    setIsRenameModalOpen(true);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (renamingFileId && newName.trim()) {
      handleRenameFile(renamingFileId, newName);
      setIsRenameModalOpen(false);
      setRenamingFileId(null);
      setNewName("");
    }
  }, [renamingFileId, newName, handleRenameFile]);

  const handleCreateFolderSubmit = useCallback(() => {
    handleCreateFolder(newName);
    setIsCreateFolderModalOpen(false);
    setNewName("");
  }, [handleCreateFolder, newName]);

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

  const handleEmptyTrash = useCallback(() => {
    const trashFiles = files.filter((f) => f.isDeleted);
    handlePermanentDelete(trashFiles.map((f) => f.id));
  }, [files, handlePermanentDelete]);

  const handleAddAccount = useCallback(() => {
    showToast("Memulai proses login Google...", "info");
  }, [showToast]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    showToast("Refreshing account statuses...", "info");
    setTimeout(() => {
      showToast("Statuses updated successfully", "success");
      setIsRefreshing(false);
    }, 1500);
  }, [showToast]);

  const handleEditAccount = useCallback((account: Account) => {
    setEditingAccount(account);
    setEditForm({ name: account.name, email: account.email });
    setIsEditModalOpen(true);
  }, []);

  const handleReconnect = useCallback(
    (account: Account) => {
      showToast(`Menghubungkan kembali ${account.name}...`, "info");
    },
    [showToast],
  );

  const handleDiagnostic = useCallback(
    (account: Account) => {
      showToast(`Diagnostic report for ${account.name} generated.`, "info");
    },
    [showToast],
  );

  const handleAccountLogout = useCallback(() => {
    onLogout();
    showToast("Signed out of all accounts", "info");
  }, [onLogout, showToast]);

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewClick={() => setIsUploadModalOpen(true)}
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
          onAccountMenuToggle={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          onAccountMenuClose={() => setIsAccountMenuOpen(false)}
          onLogout={handleAccountLogout}
        />

        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab !== "monitoring" ? (
                <FileBrowser
                  files={files}
                  processedFiles={processedFiles}
                  breadcrumbs={breadcrumbs}
                  currentFolderId={currentFolderId}
                  selectedFileIds={selectedFileIds}
                  viewMode={viewMode}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  isSortMenuOpen={isSortMenuOpen}
                  activeTab={activeTab}
                  isDragging={isDragging}
                  onNavigate={setCurrentFolderId}
                  onFileClick={toggleFileSelection}
                  onFileDoubleClick={handleFolderDoubleClick}
                  onContextMenu={handleContextMenu}
                  onSort={handleSort}
                  onSortMenuToggle={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  onSortMenuClose={() => setIsSortMenuOpen(false)}
                  onDownload={handleDownload}
                  onRestore={handleRestoreFiles}
                  onDeletePermanently={handlePermanentDelete}
                  onEmptyTrash={handleEmptyTrash}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClearSelection={() => setSelectedFileIds([])}
                  onCloseContextMenu={closeContextMenu}
                />
              ) : (
                <MonitoringView
                  accounts={accounts}
                  isRefreshing={isRefreshing}
                  onAddAccount={handleAddAccount}
                  onRefresh={handleRefresh}
                  onEditAccount={handleEditAccount}
                  onReconnect={handleReconnect}
                  onDiagnostic={handleDiagnostic}
                />
              )}
            </AnimatePresence>
          </div>

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

          <AnimatePresence>
            <BulkActions
              selectedCount={selectedFileIds.length}
              isTrashTab={activeTab === "trash"}
              onMoveToTrash={() => handleMoveToTrash(selectedFileIds)}
              onRestore={() => handleRestoreFiles(selectedFileIds)}
              onDeletePermanently={() => handlePermanentDelete(selectedFileIds)}
              onMoveToFolder={() => setMovingFileIds(selectedFileIds)}
              onClear={() => setSelectedFileIds([])}
            />
          </AnimatePresence>

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
          onClose={() => setIsRenameModalOpen(false)}
          value={newName}
          onChange={setNewName}
          onSubmit={handleRenameSubmit}
        />

        <CreateFolderModal
          isOpen={isCreateFolderModalOpen}
          onClose={() => setIsCreateFolderModalOpen(false)}
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
            setIsUploadModalOpen(false);
            clearUploadingFiles();
            clearPendingFiles();
          }}
          onCreateFolder={() => {
            setIsUploadModalOpen(false);
            setIsCreateFolderModalOpen(true);
          }}
          onFileSelect={handleSelectFiles}
          onFolderSelect={handleSelectFiles}
          onRemovePending={removePendingFile}
          onClearPending={clearPendingFiles}
          onStartUpload={startUpload}
          onAddMoreFiles={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.onchange = (e) =>
              handleSelectFiles((e.target as HTMLInputElement).files);
            input.click();
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onComplete={() => {
            setIsUploadModalOpen(false);
            clearUploadingFiles();
          }}
        />

        <MoveToModal
          isOpen={movingFileIds.length > 0}
          itemCount={movingFileIds.length}
          folders={files}
          movingFileIds={movingFileIds}
          onClose={() => setMovingFileIds([])}
          onMove={(targetFolderId) => {
            handleMoveFiles(movingFileIds, targetFolderId);
            setMovingFileIds([]);
          }}
        />

        <EditAccountModal
          isOpen={isEditModalOpen}
          account={editingAccount}
          formName={editForm.name}
          formEmail={editForm.email}
          onNameChange={(value) =>
            setEditForm((prev) => ({ ...prev, name: value }))
          }
          onEmailChange={(value) =>
            setEditForm((prev) => ({ ...prev, email: value }))
          }
          onClose={() => setIsEditModalOpen(false)}
          onSave={() => {
            showToast(`Perubahan untuk ${editForm.name} disimpan`, "success");
            setIsEditModalOpen(false);
          }}
          onDisconnect={() => {
            if (editingAccount) {
              showToast(`Koneksi ${editingAccount.name} diputus.`, "info");
              setIsEditModalOpen(false);
            }
          }}
          onDelete={() => {
            if (editingAccount) {
              showToast(
                `${editingAccount.name} dihapus secara permanen dari sistem.`,
                "error",
              );
              setIsEditModalOpen(false);
            }
          }}
        />
      </main>
    </div>
  );
}
