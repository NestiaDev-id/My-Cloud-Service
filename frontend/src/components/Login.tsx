import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, ShieldCheck, ChevronRight, Cloud } from "lucide-react";
import type { Account } from "@/types";

interface LoginProps {
  accounts: Account[];
  mainAccount: Account;
  onMainLogin: (email: string) => void;
  onAccountLogin: (accountId: string) => void;
}

export default function Login({
  accounts,
  mainAccount,
  onMainLogin,
  onAccountLogin,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleMainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === mainAccount.email && password === "admin") {
      onMainLogin(email);
      // Auto-select first account if exists
      if (accounts.length > 0) {
        onAccountLogin(accounts[0].id);
      }
      setError("");
    } else {
      setError(
        "Invalid email or password. (Try admin@cloudservice.com / admin)",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Cloud className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            My Cloud Service
          </h1>
          <p className="text-gray-500 mt-2">Secure multi-account storage</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-blue-600 w-6 h-6" />
            <h2 className="text-xl font-semibold text-gray-800">
              Main Website Login
            </h2>
          </div>

          <form onSubmit={handleMainLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="Enter main email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter password"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Sign In <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
