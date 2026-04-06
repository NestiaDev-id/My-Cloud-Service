import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpDown,
  ChevronDown,
  Filter,
  ArrowUp,
  ArrowDown,
  Upload,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileList } from "./FileList";
import { FileGrid } from "./FileGrid";
import type { CloudFile } from "@/types";

interface FileBrowserProps {
  files: CloudFile[];
  processedFiles: CloudFile[];
  breadcrumbs: CloudFile[];
  currentFolderId: string | null;
  selectedFileIds: string[];
  viewMode: "grid" | "list";
  sortField: "name" | "size" | "lastModified";
  sortDirection: "asc" | "desc";
  isSortMenuOpen: boolean;
  activeTab: "drive" | "monitoring" | "recent" | "shared" | "trash";
  isDragging: boolean;
  onNavigate: (folderId: string | null) => void;
  onFileClick: (fileId: string, isMulti: boolean) => void;
  onFileDoubleClick: (file: CloudFile) => void;
  onContextMenu: (e: React.MouseEvent, fileId: string) => void;
  onSort: (field: "name" | "size" | "lastModified") => void;
  onSortMenuToggle: () => void;
  onSortMenuClose: () => void;
  onDownload: (file: CloudFile) => void;
  onRestore: (fileIds: string[]) => void;
  onDeletePermanently: (fileIds: string[]) => void;
  onEmptyTrash: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClearSelection: () => void;
  onCloseContextMenu: () => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  processedFiles,
  breadcrumbs,
  currentFolderId,
  selectedFileIds,
  viewMode,
  sortField,
  sortDirection,
  isSortMenuOpen,
  activeTab,
  isDragging,
  onNavigate,
  onFileClick,
  onFileDoubleClick,
  onContextMenu,
  onSort,
  onSortMenuToggle,
  onSortMenuClose,
  onDownload,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
  onDragOver,
  onDragLeave,
  onDrop,
  onClearSelection,
  onCloseContextMenu,
}) => {
  const isTrashTab = activeTab === "trash";

  const getTitle = () => {
    if (activeTab === "trash") return "Trash";
    if (activeTab === "recent") return "Recent Files";
    if (activeTab === "shared") return "Shared with me";
    return currentFolderId
      ? breadcrumbs[breadcrumbs.length - 1]?.name
      : "My Drive";
  };

  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative min-h-full"
      onClick={() => {
        onClearSelection();
        onCloseContextMenu();
      }}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-blue-600/10 border-2 border-dashed border-blue-600 rounded-3xl flex items-center justify-center backdrop-blur-[2px]"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Drop files to upload
              </h3>
              <p className="text-gray-500 mt-2">
                Release to start uploading to My Drive
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 mb-6">
        <Breadcrumbs
          breadcrumbs={breadcrumbs}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
            {isTrashTab && (
              <button
                onClick={onEmptyTrash}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors bg-red-50 px-2 py-1 rounded-lg uppercase tracking-wider"
              >
                Empty Trash
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={onSortMenuToggle}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                <ArrowUpDown className="w-4 h-4" />
                Sort by{" "}
                {sortField === "lastModified"
                  ? "Date"
                  : sortField.charAt(0).toUpperCase() + sortField.slice(1)}
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    isSortMenuOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {isSortMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={onSortMenuClose}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-30"
                    >
                      {[
                        { id: "name", label: "Name" },
                        { id: "size", label: "Size" },
                        { id: "lastModified", label: "Last Modified" },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            onSort(
                              option.id as "name" | "size" | "lastModified",
                            );
                            onSortMenuClose();
                          }}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {option.label}
                          {sortField === option.id &&
                            (sortDirection === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            ))}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* File views */}
      {viewMode === "list" ? (
        <FileList
          files={processedFiles}
          selectedFileIds={selectedFileIds}
          sortField={sortField}
          sortDirection={sortDirection}
          isTrashTab={isTrashTab}
          onFileClick={onFileClick}
          onFileDoubleClick={onFileDoubleClick}
          onContextMenu={onContextMenu}
          onSort={onSort}
          onDownload={onDownload}
          onRestore={onRestore}
          onDeletePermanently={onDeletePermanently}
        />
      ) : (
        <FileGrid
          files={processedFiles}
          selectedFileIds={selectedFileIds}
          onFileClick={onFileClick}
          onFileDoubleClick={onFileDoubleClick}
          onContextMenu={onContextMenu}
        />
      )}

      {/* Empty state */}
      {processedFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No files found</h3>
          <p className="text-gray-500 max-w-xs mt-1">
            Try adjusting your search or upload something new.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default FileBrowser;
