import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2 } from "lucide-react";
import type { Account } from "@/types";

interface EditAccountModalProps {
  isOpen: boolean;
  account: Account | null;
  formName: string;
  formEmail: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  account,
  formName,
  formEmail,
  onNameChange,
  onEmailChange,
  onClose,
  onSave,
  onDisconnect,
  onDelete,
}) => {
  if (!account) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Akses Akun
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Nama Akun (Alias)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-2 mt-8">
                  <button
                    onClick={onSave}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                  >
                    Simpan Perubahan
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-4 text-xs">
                    {account.status === "connected" && (
                      <>
                        <button
                          onClick={onDisconnect}
                          className="text-gray-500 hover:text-amber-600 font-bold px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          Disconnect
                        </button>
                        <span className="text-gray-300">|</span>
                      </>
                    )}
                    <button
                      onClick={onDelete}
                      className="text-red-500 hover:text-red-600 font-bold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditAccountModal;
