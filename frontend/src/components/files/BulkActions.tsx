import React from "react";
import { motion } from "motion/react";
import { Trash2, FolderInput, RefreshCw, X } from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  isTrashTab: boolean;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onDeletePermanently: () => void;
  onMoveToFolder: () => void;
  onClear: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  isTrashTab,
  onMoveToTrash,
  onRestore,
  onDeletePermanently,
  onMoveToFolder,
  onClear,
}) => {
  if (selectedCount <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50"
    >
      <span className="text-sm font-bold border-r border-gray-700 pr-6">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-4">
        {isTrashTab ? (
          <>
            <button
              onClick={onRestore}
              className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm font-bold"
            >
              <RefreshCw className="w-4 h-4" />
              Restore
            </button>
            <button
              onClick={onDeletePermanently}
              className="flex items-center gap-2 hover:text-red-400 transition-colors text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" />
              Delete Forever
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onMoveToTrash}
              className="flex items-center gap-2 hover:text-red-400 transition-colors text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" />
              Move to Trash
            </button>
            <button
              onClick={onMoveToFolder}
              className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm font-bold"
            >
              <FolderInput className="w-4 h-4" />
              Move to
            </button>
          </>
        )}
        <button
          onClick={onClear}
          className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default BulkActions;
