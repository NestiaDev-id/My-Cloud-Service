import React from "react";
import { HardDrive, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CloudFile } from "@/types";

interface BreadcrumbsProps {
  breadcrumbs: CloudFile[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  breadcrumbs,
  currentFolderId,
  onNavigate,
}) => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
      <button
        onClick={() => onNavigate(null)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
          currentFolderId === null
            ? "text-blue-600 font-bold bg-blue-50"
            : "hover:bg-gray-100 hover:text-gray-900",
        )}
      >
        <HardDrive className="w-4 h-4" />
        My Drive
      </button>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <button
            onClick={() => onNavigate(crumb.id)}
            className={cn(
              "px-2 py-1 rounded-lg transition-colors",
              index === breadcrumbs.length - 1
                ? "text-blue-600 font-bold bg-blue-50"
                : "hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            {crumb.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;
