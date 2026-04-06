import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Folder } from "lucide-react";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  onSubmit,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

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
              <h3 className="font-bold text-gray-900">New Folder</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-amber-100">
                <Folder className="w-8 h-8 text-amber-400 fill-amber-400" />
              </div>
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-amber-400 rounded-xl transition-all outline-none text-sm font-medium"
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="p-6 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                className="px-6 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-100 transition-all"
              >
                Create
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateFolderModal;
