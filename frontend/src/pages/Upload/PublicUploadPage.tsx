import { useState, useCallback, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, FileUp, X, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface UploadFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export default function PublicUploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (uploadFile: UploadFile, index: number) => {
    // Update status to uploading
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f)),
    );

    try {
      // Step 1: Init upload (get resumable URL)
      const initRes = await fetch(`${API_URL}/api/upload/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadFile.file.name,
          mimeType: uploadFile.file.type || "application/octet-stream",
          fileSize: uploadFile.file.size,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || "Failed to initialize upload");
      }

      const { uploadUrl } = await initRes.json();

      // Step 2: Upload file to Google via resumable URL
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, progress } : f)),
          );
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.setRequestHeader("Content-Type", uploadFile.file.type || "application/octet-stream");
        xhr.send(uploadFile.file);
      });

      // Success
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "done", progress: 100 } : f,
        ),
      );
    } catch (error) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: "error", error: (error as Error).message }
            : f,
        ),
      );
    }
  };

  const uploadAll = () => {
    files.forEach((f, i) => {
      if (f.status === "pending") {
        uploadFile(f, i);
      }
    });
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            My Cloud Service
          </h1>
          <p className="text-blue-200/60 text-sm">
            Kirim file tanpa perlu login • Aman & Cepat
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-blue-400 bg-blue-500/10 scale-[1.02]"
              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <FileUp
            className={`w-12 h-12 mx-auto mb-4 transition-colors ${
              isDragging ? "text-blue-400" : "text-white/30"
            }`}
          />
          <p className="text-white/80 font-medium mb-1">
            {isDragging ? "Lepaskan untuk menambahkan" : "Klik atau seret file ke sini"}
          </p>
          <p className="text-white/30 text-sm">
            Semua jenis file didukung
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            {files.map((f, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">
                    {f.file.name}
                  </p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {formatSize(f.file.size)}
                  </p>
                  {f.status === "uploading" && (
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                  {f.status === "error" && (
                    <p className="text-red-400 text-xs mt-1">{f.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {f.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white/60 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {f.status === "uploading" && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  )}
                  {f.status === "done" && (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  )}
                  {f.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>
            ))}

            {/* Upload Button */}
            {pendingCount > 0 && (
              <button
                onClick={uploadAll}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]"
              >
                Kirim {pendingCount} File
              </button>
            )}

            {/* Done Summary */}
            {doneCount > 0 && pendingCount === 0 && (
              <div className="text-center py-3">
                <p className="text-emerald-400 font-medium text-sm">
                  ✓ {doneCount} file berhasil dikirim!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-8">
          File yang dikirim akan tersimpan secara aman di cloud
        </p>
      </div>
    </div>
  );
}
