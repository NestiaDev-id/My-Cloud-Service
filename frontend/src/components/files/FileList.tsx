import React from "react";
import {
  Download,
  MoreVertical,
  RefreshCw,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/common";
import { formatSize } from "@/utils";
import type { CloudFile } from "@/types";

interface FileListProps {
  files: CloudFile[];
  selectedFileIds: string[];
  sortField: "name" | "size" | "lastModified";
  sortDirection: "asc" | "desc";
  isTrashTab: boolean;
  onFileClick: (fileId: string, isMulti: boolean) => void;
  onFileDoubleClick: (file: CloudFile) => void;
  onContextMenu: (e: React.MouseEvent, fileId: string) => void;
  onSort: (field: "name" | "size" | "lastModified") => void;
  onDownload: (file: CloudFile) => void;
  onRestore: (fileIds: string[]) => void;
  onDeletePermanently: (fileIds: string[]) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFileIds,
  sortField,
  sortDirection,
  isTrashTab,
  onFileClick,
  onFileDoubleClick,
  onContextMenu,
  onSort,
  onDownload,
  onRestore,
  onDeletePermanently,
}) => {
  const SortIcon = ({ field }: { field: "name" | "size" | "lastModified" }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <th
              className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onSort("name")}
            >
              <div className="flex items-center gap-1">
                Name
                <SortIcon field="name" />
              </div>
            </th>
            <th
              className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onSort("lastModified")}
            >
              <div className="flex items-center gap-1">
                Last Modified
                <SortIcon field="lastModified" />
              </div>
            </th>
            <th
              className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onSort("size")}
            >
              <div className="flex items-center gap-1">
                File Size
                <SortIcon field="size" />
              </div>
            </th>
            <th className="px-6 py-4 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {files.map((file) => (
            <tr
              key={file.id}
              onClick={(e) => {
                e.stopPropagation();
                onFileClick(file.id, e.ctrlKey || e.metaKey);
              }}
              onDoubleClick={() => onFileDoubleClick(file)}
              onContextMenu={(e) => onContextMenu(e, file.id)}
              className={cn(
                "group transition-colors cursor-pointer border-b border-gray-50 last:border-0",
                selectedFileIds.includes(file.id)
                  ? "bg-blue-50/50"
                  : "hover:bg-gray-50/50",
              )}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <FileIcon type={file.type} />
                  <span
                    className={cn(
                      "text-sm font-medium group-hover:text-blue-600 transition-colors truncate max-w-xs",
                      selectedFileIds.includes(file.id)
                        ? "text-blue-600"
                        : "text-gray-700",
                    )}
                  >
                    {file.name}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-xs text-gray-500">
                {format(new Date(file.lastModified), "MMM d, yyyy")}
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                {file.type === "folder"
                  ? `${file.itemCount || 0} items`
                  : formatSize(file.size)}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isTrashTab ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestore([file.id]);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-green-600 transition-all shadow-sm border border-transparent hover:border-green-100"
                        title="Restore"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePermanently([file.id]);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-600 transition-all shadow-sm border border-transparent hover:border-red-100"
                        title="Delete Forever"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(file);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 transition-all shadow-sm border border-transparent hover:border-blue-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onContextMenu(e, file.id);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileList;
