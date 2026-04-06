import React from "react";
import { Modal } from "@/components/common";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
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
    <Modal isOpen={isOpen} onClose={onClose} title="Rename" size="sm">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mb-6"
        placeholder="Enter new name"
      />
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-200"
        >
          Rename
        </button>
      </div>
    </Modal>
  );
};

export default RenameModal;
