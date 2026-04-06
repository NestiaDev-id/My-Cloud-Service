import { useState, useCallback } from "react";
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

interface UseUploadOptions {
  accounts: Account[];
  currentFolderId: string | null;
  onToast: (message: string, type: "success" | "error" | "info") => void;
  onFilesAdded: (files: CloudFile[]) => void;
}

export function useUpload({
  accounts,
  currentFolderId,
  onToast,
  onFilesAdded,
}: UseUploadOptions) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const newFiles = Array.from(selectedFiles);
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPendingFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const startUpload = useCallback(() => {
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

    setUploadingFiles((prev) => [...prev, ...filesToUpload]);
    setPendingFiles([]);

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

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadingFile.id
              ? {
                  ...f,
                  progress: percent,
                  estimatedTimeRemaining: eta,
                  status: percent === 100 ? "completed" : "uploading",
                }
              : f,
          ),
        );

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

          onFilesAdded([newFile]);
          onToast(`${uploadingFile.name} uploaded successfully!`, "success");
        }
      }, 100);
    });
  }, [pendingFiles, accounts, currentFolderId, onFilesAdded, onToast]);

  const clearUploadingFiles = useCallback(() => {
    setUploadingFiles([]);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleSelectFiles(e.dataTransfer.files);
    },
    [handleSelectFiles],
  );

  return {
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
    setIsDragging,
  };
}

export default useUpload;
