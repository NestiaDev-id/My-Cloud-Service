import { useOutletContext } from "react-router-dom";
import { FileBrowser } from "@/components/files";
import { useFileStore, useUploadStore, useUIStore } from "@/stores";
import type { CloudFile } from "@/types";

interface OutletContext {
  onContextMenu: (e: React.MouseEvent, fileId: string) => void;
  onDownload: (file: CloudFile) => void;
  onMoveToTrash: (fileIds: string[]) => void;
  onRestoreFiles: (fileIds: string[]) => void;
  onPermanentDelete: (fileIds: string[]) => void;
}

export default function DrivePage() {
  const { onContextMenu, onDownload, onMoveToTrash, onPermanentDelete } =
    useOutletContext<OutletContext>();

  // File store
  const {
    files,
    selectedFileIds,
    currentFolderId,
    sortField,
    sortDirection,
    isLoadingMore,
    pagination,
    getProcessedFiles,
    getBreadcrumbs,
    setCurrentFolderId,
    setSelectedFileIds,
    toggleFileSelection,
    handleFolderDoubleClick,
    handleSort,
    loadMore,
  } = useFileStore();

  // Upload store
  const { isDragging, onDragOver, onDragLeave, onDrop } = useUploadStore();

  // UI store
  const {
    viewMode,
    isSortMenuOpen,
    toggleSortMenu,
    closeSortMenu,
    closeContextMenu,
  } = useUIStore();

  const processedFiles = getProcessedFiles("drive");
  const breadcrumbs = getBreadcrumbs();

  return (
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
      activeTab="drive"
      isDragging={isDragging}
      isLoadingMore={isLoadingMore}
      hasMore={pagination.hasMore}
      onLoadMore={loadMore}
      onNavigate={setCurrentFolderId}
      onFileClick={toggleFileSelection}
      onFileDoubleClick={handleFolderDoubleClick}
      onContextMenu={onContextMenu}
      onSort={handleSort}
      onSortMenuToggle={toggleSortMenu}
      onSortMenuClose={closeSortMenu}
      onDownload={onDownload}
      onRestore={() => {}}
      onDeletePermanently={onPermanentDelete}
      onEmptyTrash={() =>
        onMoveToTrash(files.filter((f) => f.isDeleted).map((f) => f.id))
      }
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClearSelection={() => setSelectedFileIds([])}
      onCloseContextMenu={closeContextMenu}
    />
  );
}
