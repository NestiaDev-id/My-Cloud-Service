import { create } from "zustand";
import type { CloudFile } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
  uploadUrl?: string;
  accountId?: string;
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
    currentFolderId: string | null,
    onFileAdded: (file: CloudFile) => void,
    onComplete: (fileName: string) => void
  ) => Promise<void>;

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

  startUpload: async (currentFolderId, onFileAdded, onComplete) => {
    const { pendingFiles } = get();
    if (pendingFiles.length === 0) return;

    // Process each file
    for (const file of pendingFiles) {
      const uploadingFile: UploadingFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading",
        startTime: Date.now(),
        estimatedTimeRemaining: 0,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
        fileRef: file,
      };

      set((state) => ({
        uploadingFiles: [...state.uploadingFiles, uploadingFile],
        pendingFiles: state.pendingFiles.filter((f) => f !== file),
      }));

      try {
        // 1. Initialize upload with backend
        const initResponse = await fetch(`${API_URL}/api/upload/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            parentId: currentFolderId,
          }),
        });

        if (!initResponse.ok) {
          throw new Error("Failed to initialize upload");
        }

        const { uploadUrl, accountId } = await initResponse.json();

        // Update with upload URL
        set((state) => ({
          uploadingFiles: state.uploadingFiles.map((f) =>
            f.id === uploadingFile.id ? { ...f, uploadUrl, accountId } : f
          ),
        }));

        // 2. Upload directly to Google Drive using resumable upload URL
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Content-Length": file.size.toString(),
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const uploadedFile = await uploadResponse.json();

        // 3. Notify backend upload is complete
        await fetch(`${API_URL}/api/upload/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountId,
            fileSize: file.size,
          }),
        });

        // Update progress to 100%
        set((state) => ({
          uploadingFiles: state.uploadingFiles.map((f) =>
            f.id === uploadingFile.id
              ? { ...f, progress: 100, status: "completed" }
              : f
          ),
        }));

        // Create CloudFile from response
        const newFile: CloudFile = {
          id: `${accountId}:${uploadedFile.id}`,
          name: uploadedFile.name,
          size: parseInt(uploadedFile.size || "0"),
          type: file.type.includes("image")
            ? "image"
            : file.type.includes("pdf")
              ? "pdf"
              : "other",
          lastModified: new Date().toISOString(),
          ownerId: accountId,
          parentId: currentFolderId || undefined,
          thumbnailUrl: uploadedFile.thumbnailLink || uploadingFile.previewUrl,
        };

        onFileAdded(newFile);
        onComplete(file.name);
      } catch (error) {
        console.error("Upload error:", error);
        set((state) => ({
          uploadingFiles: state.uploadingFiles.map((f) =>
            f.id === uploadingFile.id ? { ...f, status: "error" } : f
          ),
        }));
      }
    }
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
