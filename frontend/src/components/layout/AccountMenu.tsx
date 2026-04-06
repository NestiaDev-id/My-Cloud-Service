import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account } from "@/types";

interface AccountMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  activeAccount: Account;
  mainAccount: Account | null;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  onLogout,
  activeAccount,
  mainAccount,
}) => {
  const displayAccount = mainAccount || activeAccount;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-full transition-all"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm",
            displayAccount.color,
          )}
        >
          {(displayAccount.avatar || displayAccount.name[0]).substring(0, 2)}
        </div>
        <div className="hidden lg:block text-left mr-2">
          <p className="text-xs font-bold text-gray-900 leading-none">
            {displayAccount.name}
          </p>
          <p className="text-[10px] text-gray-500 leading-none mt-1">Admin</p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={onClose} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-4 z-30"
            >
              <div className="px-6 py-4 border-b border-gray-50 text-center">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg",
                    displayAccount.color,
                  )}
                >
                  {(displayAccount.avatar || displayAccount.name[0]).substring(
                    0,
                    2,
                  )}
                </div>
                <h3 className="font-bold text-gray-900">
                  {displayAccount.name}
                </h3>
                <p className="text-sm text-gray-500">{displayAccount.email}</p>
                <div className="mt-2 inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Root Access
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-50 px-2">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountMenu;
