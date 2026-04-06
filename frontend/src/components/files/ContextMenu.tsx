import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Share2,
  Pencil,
  FolderInput,
  Info,
  Trash2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import type { CloudFile } from "@/types";

interface ContextMenuProps {
  contextMenu: { x: number; y: number; fileId: string } | null;
  files: CloudFile[];
  selectedFileIds: string[];
  isTrashTab: boolean;
  onClose: () => void;
  onDownload: (file: CloudFile) => void;
  onShare: (file: CloudFile) => void;
  onRename: (file: CloudFile) => void;
  onMove: (fileIds: string[]) => void;
  onViewDetails: (fileId: string) => void;
  onMoveToTrash: (fileIds: string[]) => void;
  onOpenFolder: (file: CloudFile) => void;
  onRestore: (fileIds: string[]) => void;
  onDeletePermanently: (fileIds: string[]) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  files,
  selectedFileIds,
  isTrashTab,
  onClose,
  onDownload,
  onShare,
  onRename,
  onMove,
  onViewDetails,
  onMoveToTrash,
  onOpenFolder,
  onRestore,
  onDeletePermanently,
}) => {
  if (!contextMenu) return null;

  const file = files.find((f) => f.id === contextMenu.fileId);
  const isMultiSelect = selectedFileIds.length > 1;

  return (
    <AnimatePresence>
      <>
        <div
          className="fixed inset-0 z-[100]"
          onClick={onClose}
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 101,
          }}
          className="w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 overflow-hidden"
        >
          {isMultiSelect ? (
            <>
              {isTrashTab ? (
                <>
                  <button
                    onClick={() => {
                      onRestore(selectedFileIds);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restore {selectedFileIds.length} items
                  </button>
                  <button
                    onClick={() => {
                      onDeletePermanently(selectedFileIds);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onMoveToTrash(selectedFileIds);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Move to trash
                  </button>
                  <button
                    onClick={() => {
                      onMove(selectedFileIds);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <FolderInput className="w-4 h-4" />
                    Move to folder
                  </button>
                </>
              )}
            </>
          ) : file?.isDeleted ? (
            <>
              <button
                onClick={() => {
                  onRestore([contextMenu.fileId]);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Restore
              </button>
              <button
                onClick={() => {
                  onDeletePermanently([contextMenu.fileId]);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Forever
              </button>
            </>
          ) : (
            <>
              {file?.type === "folder" ? (
                <button
                  onClick={() => {
                    if (file) onOpenFolder(file);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (file) onDownload(file);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}

              <button
                onClick={() => {
                  if (file) onShare(file);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              <div className="h-px bg-gray-50 my-1" />

              <button
                onClick={() => {
                  if (file) onRename(file);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Rename
              </button>

              <button
                onClick={() => {
                  if (file) onMove([file.id]);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <FolderInput className="w-4 h-4" />
                Move to
              </button>

              <div className="h-px bg-gray-50 my-1" />

              <button
                onClick={() => {
                  onViewDetails(contextMenu.fileId);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Info className="w-4 h-4" />
                View details
              </button>

              <button
                onClick={() => {
                  onMoveToTrash([contextMenu.fileId]);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Move to trash
              </button>
            </>
          )}
        </motion.div>
      </>
    </AnimatePresence>
  );
};

export default ContextMenu;
