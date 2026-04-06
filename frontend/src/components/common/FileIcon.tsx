import React from "react";
import { Folder, FileText, Image as ImageIcon, FileCode } from "lucide-react";
import type { FileType } from "@/types";

interface FileIconProps {
  type: FileType;
  className?: string;
}

export const FILE_ICONS: Record<FileType, React.ReactNode> = {
  folder: <Folder className="w-5 h-5 text-amber-400 fill-amber-400" />,
  pdf: <FileText className="w-5 h-5 text-red-500" />,
  image: <ImageIcon className="w-5 h-5 text-blue-500" />,
  doc: <FileText className="w-5 h-5 text-blue-600" />,
  archive: <FileCode className="w-5 h-5 text-purple-500" />,
  other: <FileText className="w-5 h-5 text-gray-400" />,
};

export const FileIcon: React.FC<FileIconProps> = ({ type, className }) => {
  const icon = FILE_ICONS[type];
  if (className && React.isValidElement(icon)) {
    return React.cloneElement(
      icon as React.ReactElement<{ className?: string }>,
      { className },
    );
  }
  return <>{icon}</>;
};

export default FileIcon;
