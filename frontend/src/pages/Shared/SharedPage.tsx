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

export default function SharedPage() {
  const { onContextMenu, onDownload, onMoveToTrash, onPermanentDelete } =
    useOutletContext<OutletContext>();

  // File store
  const {
    files,
    selectedFileIds,
    sortField,
    sortDirection,
    getProcessedFiles,
    setSelectedFileIds,
    toggleFileSelection,
    handleFolderDoubleClick,
    handleSort,
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

  const processedFiles = getProcessedFiles("shared");

  return (
    <FileBrowser
      files={files}
      processedFiles={processedFiles}
      breadcrumbs={[]}
      currentFolderId={null}
      selectedFileIds={selectedFileIds}
      viewMode={viewMode}
      sortField={sortField}
      sortDirection={sortDirection}
      isSortMenuOpen={isSortMenuOpen}
      activeTab="shared"
      isDragging={isDragging}
      onNavigate={() => {}}
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
