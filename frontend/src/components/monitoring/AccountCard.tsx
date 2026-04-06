import React from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Pencil,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatSize } from "@/utils";
import type { Account } from "@/types";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onReconnect: (account: Account) => void;
  onDiagnostic: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onReconnect,
  onDiagnostic,
}) => {
  const storagePercent = (account.usedStorage / account.totalStorage) * 100;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg",
            account.color,
          )}
        >
          {account.name[0]}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{account.name}</h3>
          <p className="text-sm text-gray-500">{account.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-12">
        <div className="w-48 hidden lg:block">
          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            <span>Storage</span>
            <span>{Math.round(storagePercent)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${storagePercent}%` }}
              className={cn(
                "h-full rounded-full",
                storagePercent > 90 ? "bg-red-500" : "bg-blue-600",
              )}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {formatSize(account.usedStorage)} of{" "}
            {formatSize(account.totalStorage)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Last Checked
          </p>
          <p className="text-sm font-medium text-gray-700">
            {format(new Date(account.lastCheck), "HH:mm:ss")}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
          {account.status === "connected" ? (
            <>
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Connected
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </>
          ) : (
            <>
              <button
                onClick={() => onReconnect(account)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Connect
              </button>
              <div className="w-1 h-4 bg-gray-200 mx-1" />
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm opacity-50">
                <XCircle className="w-5 h-5" />
                Disconnected
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(account)}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-blue-600 transition-all"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onDiagnostic(account)}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
        >
          <AlertCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AccountCard;
