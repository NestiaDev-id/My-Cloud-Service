import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Folder, HardDrive } from "lucide-react";
import type { CloudFile } from "@/types";

interface MoveToModalProps {
  isOpen: boolean;
  itemCount: number;
  folders: CloudFile[];
  movingFileIds: string[];
  onClose: () => void;
  onMove: (targetFolderId: string | null) => void;
}

export const MoveToModal: React.FC<MoveToModalProps> = ({
  isOpen,
  itemCount,
  folders,
  movingFileIds,
  onClose,
  onMove,
}) => {
  const availableFolders = folders.filter(
    (f) => f.type === "folder" && !movingFileIds.includes(f.id) && !f.isDeleted,
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                Move {itemCount} item(s) to
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => onMove(null)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 rounded-2xl transition-colors text-left group"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">My Drive</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    Root Directory
                  </p>
                </div>
              </button>

              <div className="h-px bg-gray-50 my-2 mx-4" />

              {availableFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => onMove(folder.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 rounded-2xl transition-colors text-left group"
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <Folder className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {folder.name}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      {folder.itemCount || 0} items
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6 bg-gray-50 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MoveToModal;
