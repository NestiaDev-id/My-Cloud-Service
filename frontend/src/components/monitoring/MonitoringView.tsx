import React from "react";
import { motion } from "motion/react";
import { Plus, RefreshCw } from "lucide-react";
import { AccountCard } from "./AccountCard";
import { SystemHealth } from "./SystemHealth";
import type { Account } from "@/types";

interface MonitoringViewProps {
  accounts: Account[];
  isRefreshing: boolean;
  onAddAccount: () => void;
  onRefresh: () => void;
  onEditAccount: (account: Account) => void;
  onReconnect: (account: Account) => void;
  onDiagnostic: (account: Account) => void;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  accounts,
  isRefreshing,
  onAddAccount,
  onRefresh,
  onEditAccount,
  onReconnect,
  onDiagnostic,
}) => {
  const healthyAccounts = accounts.filter(
    (a) => a.status === "connected",
  ).length;
  const issueAccounts = accounts.filter(
    (a) => a.status === "disconnected",
  ).length;

  return (
    <motion.div
      key="monitoring"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Account Monitoring
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time status of all connected cloud accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddAccount}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={
                isRefreshing
                  ? { repeat: Infinity, duration: 1, ease: "linear" }
                  : { duration: 0.5 }
              }
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
            Refresh Status
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onEdit={onEditAccount}
            onReconnect={onReconnect}
            onDiagnostic={onDiagnostic}
          />
        ))}
      </div>

      <SystemHealth
        totalAccounts={accounts.length}
        healthyAccounts={healthyAccounts}
        issueAccounts={issueAccounts}
      />
    </motion.div>
  );
};

export default MonitoringView;
