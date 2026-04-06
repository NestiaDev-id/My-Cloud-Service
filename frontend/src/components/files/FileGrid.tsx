import React from "react";
import { motion } from "motion/react";
import { MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/common";
import { formatSize } from "@/utils";
import type { CloudFile } from "@/types";

interface FileGridProps {
  files: CloudFile[];
  selectedFileIds: string[];
  onFileClick: (fileId: string, isMulti: boolean) => void;
  onFileDoubleClick: (file: CloudFile) => void;
  onContextMenu: (e: React.MouseEvent, fileId: string) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  files,
  selectedFileIds,
  onFileClick,
  onFileDoubleClick,
  onContextMenu,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {files.map((file) => (
        <motion.div
          key={file.id}
          whileHover={{ y: -4 }}
          onClick={(e) => {
            e.stopPropagation();
            onFileClick(file.id, e.ctrlKey || e.metaKey);
          }}
          onDoubleClick={() => onFileDoubleClick(file)}
          onContextMenu={(e) => onContextMenu(e, file.id)}
          className={cn(
            "p-4 rounded-2xl shadow-sm border transition-all group cursor-pointer",
            selectedFileIds.includes(file.id)
              ? "bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-100"
              : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md",
          )}
        >
          <div className="aspect-square bg-gray-50 rounded-xl mb-4 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <FileIcon type={file.type} className="w-12 h-12" />
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold truncate group-hover:text-blue-600 transition-colors",
                  selectedFileIds.includes(file.id)
                    ? "text-blue-600"
                    : "text-gray-800",
                )}
              >
                {file.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {format(new Date(file.lastModified), "MMM d")} •{" "}
                {file.type === "folder"
                  ? `${file.itemCount || 0} items`
                  : formatSize(file.size)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onContextMenu(e, file.id);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default FileGrid;
