import React from "react";

interface SystemHealthProps {
  totalAccounts: number;
  healthyAccounts: number;
  issueAccounts: number;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({
  totalAccounts,
  healthyAccounts,
  issueAccounts,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-200">
        <p className="text-blue-100 text-sm font-medium mb-1">Total Accounts</p>
        <p className="text-3xl font-bold">{totalAccounts}</p>
      </div>
      <div className="bg-emerald-500 p-6 rounded-3xl text-white shadow-xl shadow-emerald-100">
        <p className="text-emerald-100 text-sm font-medium mb-1">Healthy</p>
        <p className="text-3xl font-bold">{healthyAccounts}</p>
      </div>
      <div className="bg-red-500 p-6 rounded-3xl text-white shadow-xl shadow-red-100">
        <p className="text-red-100 text-sm font-medium mb-1">Issues Detected</p>
        <p className="text-3xl font-bold">{issueAccounts}</p>
      </div>
    </div>
  );
};

export default SystemHealth;
