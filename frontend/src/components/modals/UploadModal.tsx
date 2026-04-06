import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Folder,
  Upload,
  FolderInput,
  Plus,
  File,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSize } from "@/utils";

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "completed" | "error";
  startTime: number;
  estimatedTimeRemaining: number;
  previewUrl?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  pendingFiles: File[];
  uploadingFiles: UploadingFile[];
  isDragging: boolean;
  onClose: () => void;
  onCreateFolder: () => void;
  onFileSelect: (files: FileList | null) => void;
  onFolderSelect: (files: FileList | null) => void;
  onRemovePending: (index: number) => void;
  onClearPending: () => void;
  onStartUpload: () => void;
  onAddMoreFiles: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onComplete: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  pendingFiles,
  uploadingFiles,
  isDragging,
  onClose,
  onCreateFolder,
  onFileSelect,
  onFolderSelect,
  onRemovePending,
  onClearPending,
  onStartUpload,
  onAddMoreFiles,
  onDragOver,
  onDragLeave,
  onDrop,
  onComplete,
}) => {
  const canClose =
    uploadingFiles.every((f) => f.status === "completed") &&
    pendingFiles.length === 0;

  const handleClose = () => {
    if (
      canClose ||
      (uploadingFiles.length === 0 && pendingFiles.length === 0)
    ) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  New Item
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Upload files or create new folders
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm border border-transparent hover:border-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              {uploadingFiles.length === 0 && pendingFiles.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <button
                      onClick={onCreateFolder}
                      className="w-full flex items-center gap-4 p-5 bg-amber-50 hover:bg-amber-100 rounded-3xl transition-all group border border-amber-100"
                    >
                      <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                        <Folder className="text-white w-6 h-6 fill-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">New Folder</p>
                        <p className="text-xs text-amber-700 font-medium">
                          Create a directory
                        </p>
                      </div>
                    </button>

                    <label className="w-full flex items-center gap-4 p-5 bg-blue-50 hover:bg-blue-100 rounded-3xl transition-all group border border-blue-100 cursor-pointer">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                        <Upload className="text-white w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">Upload Files</p>
                        <p className="text-xs text-blue-700 font-medium">
                          Select from computer
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => onFileSelect(e.target.files)}
                      />
                    </label>

                    <label className="w-full flex items-center gap-4 p-5 bg-purple-50 hover:bg-purple-100 rounded-3xl transition-all group border border-purple-100 cursor-pointer">
                      <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                        <FolderInput className="text-white w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">Upload Folder</p>
                        <p className="text-xs text-purple-700 font-medium">
                          Upload entire directory
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        // @ts-ignore
                        webkitdirectory=""
                        directory=""
                        className="hidden"
                        onChange={(e) => onFolderSelect(e.target.files)}
                      />
                    </label>
                  </div>

                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={cn(
                      "relative border-3 border-dashed rounded-[2rem] p-8 transition-all duration-300 flex flex-col items-center justify-center group",
                      isDragging
                        ? "border-blue-500 bg-blue-50/50 scale-[0.98]"
                        : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50",
                    )}
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-500">
                      <Upload className="text-gray-400 w-8 h-8 group-hover:text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">
                      Drop files here
                    </h4>
                    <p className="text-gray-400 text-xs font-medium text-center">
                      Drag and drop files to start uploading
                    </p>
                  </div>
                </div>
              ) : pendingFiles.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-gray-900">
                      Selected Files ({pendingFiles.length})
                    </h4>
                    <button
                      onClick={onClearPending}
                      className="text-sm font-bold text-red-600 hover:text-red-700"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {pendingFiles.map((file, idx) => {
                      const isImage = file.type.startsWith("image/");
                      const previewUrl = isImage
                        ? URL.createObjectURL(file)
                        : null;

                      return (
                        <div
                          key={idx}
                          className="relative group bg-gray-50 rounded-3xl p-3 border border-gray-100 hover:border-blue-200 transition-all"
                        >
                          <div className="aspect-square rounded-2xl bg-white mb-3 overflow-hidden flex items-center justify-center shadow-sm">
                            {isImage ? (
                              <img
                                src={previewUrl!}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <File className="w-8 h-8 text-gray-300" />
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">
                            {formatSize(file.size)}
                          </p>

                          <button
                            onClick={() => onRemovePending(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    <label className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group">
                      <Plus className="w-6 h-6 text-gray-300 group-hover:text-blue-500" />
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600">
                        Add more
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => onFileSelect(e.target.files)}
                      />
                    </label>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      onClick={onClearPending}
                      className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onStartUpload}
                      className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      Start Uploading
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">
                      {
                        uploadingFiles.filter((f) => f.status === "completed")
                          .length
                      }{" "}
                      of {uploadingFiles.length} files uploaded
                    </span>
                    <button
                      onClick={onAddMoreFiles}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Add more files
                    </button>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {uploadingFiles.map((file) => (
                      <div
                        key={file.id}
                        className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100 group hover:border-blue-100 hover:bg-white transition-all duration-300"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {file.previewUrl ? (
                              <img
                                src={file.previewUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <File className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="text-sm font-bold text-gray-900 truncate pr-4">
                                {file.name}
                              </h5>
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                                {file.status === "completed"
                                  ? "Done"
                                  : `${file.progress}%`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                              <span>{formatSize(file.size)}</span>
                              {file.status === "uploading" && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {file.estimatedTimeRemaining}s remaining
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                              file.status === "completed"
                                ? "bg-emerald-500"
                                : "bg-blue-600",
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {uploadingFiles.every((f) => f.status === "completed") && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-4"
                    >
                      <button
                        onClick={onComplete}
                        className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Complete Upload
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UploadModal;
