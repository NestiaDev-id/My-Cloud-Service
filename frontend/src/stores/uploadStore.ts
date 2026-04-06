import { create } from "zustand";
import type { CloudFile, Account } from "@/types";

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "completed" | "error";
  startTime: number;
  estimatedTimeRemaining: number;
  previewUrl?: string;
  fileRef: File;
}

interface UploadState {
  pendingFiles: File[];
  uploadingFiles: UploadingFile[];
  isDragging: boolean;

  // Actions
  setIsDragging: (dragging: boolean) => void;
  addPendingFiles: (files: FileList | null) => void;
  removePendingFile: (index: number) => void;
  clearPendingFiles: () => void;
  clearUploadingFiles: () => void;
  startUpload: (
    accounts: Account[],
    currentFolderId: string | null,
    onFileAdded: (file: CloudFile) => void,
    onComplete: (fileName: string) => void,
  ) => void;

  // Drag handlers
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  pendingFiles: [],
  uploadingFiles: [],
  isDragging: false,

  setIsDragging: (dragging) => set({ isDragging: dragging }),

  addPendingFiles: (files) => {
    if (!files || files.length === 0) return;
    set((state) => ({
      pendingFiles: [...state.pendingFiles, ...Array.from(files)],
    }));
  },

  removePendingFile: (index) => {
    set((state) => ({
      pendingFiles: state.pendingFiles.filter((_, i) => i !== index),
    }));
  },

  clearPendingFiles: () => set({ pendingFiles: [] }),

  clearUploadingFiles: () => set({ uploadingFiles: [] }),

  startUpload: (accounts, currentFolderId, onFileAdded, onComplete) => {
    const { pendingFiles } = get();
    if (pendingFiles.length === 0) return;

    const filesToUpload: UploadingFile[] = pendingFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading" as const,
      startTime: Date.now(),
      estimatedTimeRemaining: 0,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      fileRef: file,
    }));

    set((state) => ({
      uploadingFiles: [...state.uploadingFiles, ...filesToUpload],
      pendingFiles: [],
    }));

    filesToUpload.forEach((uploadingFile) => {
      let progress = 0;
      const totalSize = uploadingFile.size;
      const uploadSpeed = Math.random() * 500000 + 200000;

      const interval = setInterval(() => {
        progress += uploadSpeed / 10;
        const percent = Math.min(Math.round((progress / totalSize) * 100), 100);

        const elapsedTime = (Date.now() - uploadingFile.startTime) / 1000;
        const currentSpeed = progress / elapsedTime;
        const remainingSize = totalSize - progress;
        const eta = Math.max(0, Math.round(remainingSize / currentSpeed));

        set((state) => ({
          uploadingFiles: state.uploadingFiles.map((f) =>
            f.id === uploadingFile.id
              ? {
                  ...f,
                  progress: percent,
                  estimatedTimeRemaining: eta,
                  status: percent === 100 ? "completed" : "uploading",
                }
              : f,
          ),
        }));

        if (percent === 100) {
          clearInterval(interval);

          const newFile: CloudFile = {
            id: uploadingFile.id,
            name: uploadingFile.name,
            size: uploadingFile.size,
            type: uploadingFile.fileRef.type.includes("image")
              ? "image"
              : uploadingFile.fileRef.type.includes("pdf")
                ? "pdf"
                : "other",
            lastModified: new Date().toISOString(),
            ownerId: accounts[Math.floor(Math.random() * accounts.length)].id,
            parentId: currentFolderId || undefined,
            thumbnailUrl:
              uploadingFile.previewUrl ||
              (uploadingFile.fileRef.type.includes("image")
                ? `https://picsum.photos/seed/${Math.random()}/400/400`
                : undefined),
          };

          onFileAdded(newFile);
          onComplete(uploadingFile.name);
        }
      }, 100);
    });
  },

  onDragOver: (e) => {
    e.preventDefault();
    set({ isDragging: true });
  },

  onDragLeave: () => {
    set({ isDragging: false });
  },

  onDrop: (e) => {
    e.preventDefault();
    set({ isDragging: false });
    get().addPendingFiles(e.dataTransfer.files);
  },
}));
