import React from "react";
import { motion } from "motion/react";
import {
  X,
  ExternalLink,
  Pencil,
  FolderInput,
  Download,
  Trash2,
  RefreshCw,
  File,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FILE_ICONS } from "@/components/common";
import { formatSize } from "@/utils";
import type { CloudFile, Account } from "@/types";

interface FileDetailsProps {
  selectedFileIds: string[];
  selectedFile: CloudFile | undefined;
  files: CloudFile[];
  activeAccount: Account;
  accounts: Account[];
  isTrashTab: boolean;
  onClose: () => void;
  onRename: (file: CloudFile) => void;
  onMove: (fileIds: string[]) => void;
  onDownload: (file: CloudFile) => void;
  onPreview: (file: CloudFile) => void;
  onRestore: (fileIds: string[]) => void;
  onDeletePermanently: (fileIds: string[]) => void;
  onMoveToTrash: (fileIds: string[]) => void;
}

export const FileDetails: React.FC<FileDetailsProps> = ({
  selectedFileIds,
  selectedFile,
  files,
  activeAccount,
  accounts,
  isTrashTab,
  onClose,
  onRename,
  onMove,
  onDownload,
  onPreview,
  onRestore,
  onDeletePermanently,
  onMoveToTrash,
}) => {
  if (selectedFileIds.length === 0) return null;

  const totalSize = files
    .filter((f) => selectedFileIds.includes(f.id))
    .reduce((acc, f) => acc + f.size, 0);

  const ownerAccount = accounts.find((a) => a.id === selectedFile.ownerId) || activeAccount;

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-80 bg-white border-l border-gray-200 flex flex-col z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">
          {selectedFileIds.length > 1
            ? `${selectedFileIds.length} items selected`
            : "Details"}
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {selectedFileIds.length === 1 && selectedFile ? (
          <>
            <div className="aspect-square bg-gray-50 rounded-3xl flex items-center justify-center mb-6 border border-gray-100 shadow-inner overflow-hidden relative group">
              {selectedFile.thumbnailUrl ? (
                <img
                  src={selectedFile.thumbnailUrl}
                  alt={selectedFile.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {React.cloneElement(
                    FILE_ICONS[selectedFile.type] as React.ReactElement<{
                      className?: string;
                    }>,
                    { className: "w-24 h-24 drop-shadow-sm" },
                  )}
                  {selectedFile.type === "folder" && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Folder Preview Not Available
                    </span>
                  )}
                </div>
              )}
              {selectedFile.type !== "folder" && !selectedFile.isDeleted && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => onPreview(selectedFile)}
                    className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl text-blue-600 hover:scale-110 transition-transform"
                  >
                    <ExternalLink className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            <h4 className="text-lg font-bold text-gray-900 mb-6 break-words leading-tight">
              {selectedFile.name}
            </h4>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Properties
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-500">Type</span>
                    <span className="text-xs font-semibold text-gray-900 uppercase">
                      {selectedFile.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-500">Size</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {selectedFile.type === "folder"
                        ? "--"
                        : formatSize(selectedFile.size)}
                    </span>
                  </div>
                  {selectedFile.type === "folder" && (
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-500">Contains</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {selectedFile.itemCount || 0} items
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-500">Last Modified</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {format(
                        new Date(selectedFile.lastModified),
                        "MMM d, yyyy HH:mm",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-start text-right">
                    <span className="text-xs text-gray-500 mr-2">Owner</span>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm",
                            ownerAccount.color,
                          )}
                        >
                          {ownerAccount.name[0]}
                        </div>
                        <span className="text-xs font-semibold text-gray-900">
                          {ownerAccount.name}
                        </span>
                      </div>
                      {selectedFile.ownerEmail && (
                        <span
                          className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-full",
                            accounts.some((a) => a.email === selectedFile.ownerEmail)
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600",
                          )}
                        >
                          {accounts.some((a) => a.email === selectedFile.ownerEmail)
                            ? "✓ Internal"
                            : "👤 External"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Actions
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {isTrashTab ? (
                    <>
                      <button
                        onClick={() => onRestore([selectedFile.id])}
                        className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold text-blue-700 transition-all border border-blue-100"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Restore
                      </button>
                      <button
                        onClick={() => onDeletePermanently([selectedFile.id])}
                        className="flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-700 transition-all border border-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onRename(selectedFile)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-all border border-gray-100"
                      >
                        <Pencil className="w-4 h-4" />
                        Rename
                      </button>
                      <button
                        onClick={() => onMove([selectedFile.id])}
                        className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-all border border-gray-100"
                      >
                        <FolderInput className="w-4 h-4" />
                        Move
                      </button>
                      <button
                        onClick={() => onDownload(selectedFile)}
                        className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-sm shadow-blue-200"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="aspect-square bg-gray-50 rounded-3xl flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
              <div className="flex flex-col items-center gap-3">
                <div className="flex -space-x-4">
                  {[...Array(Math.min(3, selectedFileIds.length))].map(
                    (_, i) => (
                      <div
                        key={i}
                        className="w-16 h-16 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center transform rotate-[-5deg] even:rotate-[5deg]"
                      >
                        <File className="w-8 h-8 text-blue-600" />
                      </div>
                    ),
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                  Multiple Selection
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">Items Selected</span>
                <span className="text-xs font-semibold text-gray-900">
                  {selectedFileIds.length}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">Total Size</span>
                <span className="text-xs font-semibold text-gray-900">
                  {formatSize(totalSize)}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Bulk Actions
              </p>
              <div className="grid grid-cols-1 gap-3">
                {isTrashTab ? (
                  <>
                    <button
                      onClick={() => onRestore(selectedFileIds)}
                      className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-sm shadow-blue-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Restore Selected Items
                    </button>
                    <button
                      onClick={() => onDeletePermanently(selectedFileIds)}
                      className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-700 transition-all border border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onMoveToTrash(selectedFileIds)}
                      className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-700 transition-all border border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      Move to Trash
                    </button>
                    <button
                      onClick={() => onMove(selectedFileIds)}
                      className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-all border border-gray-100"
                    >
                      <FolderInput className="w-4 h-4" />
                      Move to Folder
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
};

export default FileDetails;
