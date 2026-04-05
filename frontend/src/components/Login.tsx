import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, ChevronRight, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Account } from '@/types';

interface LoginProps {
  accounts: Account[];
  onLogin: (accountId: string) => void;
}

export default function Login({ accounts, onLogin }: LoginProps) {
  const [step, setStep] = useState<'parent' | 'accounts'>('parent');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleParentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') { // Mock parent password
      setStep('accounts');
      setError('');
    } else {
      setError('Invalid parent password. (Try "admin")');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Cloud className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Cloud Service</h1>
          <p className="text-gray-500 mt-2">Secure multi-account storage</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'parent' ? (
            <motion.div
              key="parent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="text-blue-600 w-6 h-6" />
                <h2 className="text-xl font-semibold text-gray-800">Parent Root Login</h2>
              </div>
              
              <form onSubmit={handleParentLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Root Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="Enter root password"
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Unlock Accounts <ChevronRight className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-lg font-semibold text-gray-700">Select Account</h2>
                <button 
                  onClick={() => setStep('parent')}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Back to Root
                </button>
              </div>
              
              <div className="grid gap-4">
                {accounts.map((account) => (
                  <motion.button
                    key={account.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onLogin(account.id)}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all text-left w-full group"
                  >
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner", account.color)}>
                      {account.avatar || account.name[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{account.name}</h3>
                      <p className="text-sm text-gray-500">{account.email}</p>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
