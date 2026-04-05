import { useState, useEffect } from 'react';
import type { Account, UserSession } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { ToastProvider } from './components/Toast';

const STORAGE_ACCOUNTS: Account[] = [
  { 
    id: 'acc_a', 
    name: 'Storage Account A', 
    email: 'account_a@storage.com', 
    avatar: 'A', 
    color: 'bg-blue-500', 
    status: 'connected', 
    lastCheck: '2024-03-22T10:00:00Z',
    usedStorage: 10 * 1024 * 1024 * 1024,
    totalStorage: 15 * 1024 * 1024 * 1024 
  },
  { 
    id: 'acc_b', 
    name: 'Storage Account B', 
    email: 'account_b@storage.com', 
    avatar: 'B', 
    color: 'bg-indigo-600', 
    status: 'connected', 
    lastCheck: '2024-03-22T10:05:00Z',
    usedStorage: 45 * 1024 * 1024 * 1024,
    totalStorage: 100 * 1024 * 1024 * 1024 
  },
  { 
    id: 'acc_c', 
    name: 'Storage Account C', 
    email: 'account_c@storage.com', 
    avatar: 'C', 
    color: 'bg-emerald-500', 
    status: 'disconnected', 
    lastCheck: '2024-03-22T09:30:00Z',
    usedStorage: 2 * 1024 * 1024 * 1024,
    totalStorage: 5 * 1024 * 1024 * 1024 
  },
];

const MAIN_ACCOUNT: Account = {
  id: 'main_root',
  name: 'Main Administrator',
  email: 'admin@cloudservice.com',
  avatar: 'Admin',
  color: 'bg-slate-900',
  status: 'connected',
  lastCheck: new Date().toISOString(),
  usedStorage: 0,
  totalStorage: 0,
  isMainAccount: true
};

export default function App() {
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('cloud_session');
    return saved ? JSON.parse(saved) : { parentAuthenticated: false, activeAccountId: null, mainAccountEmail: null };
  });

  useEffect(() => {
    localStorage.setItem('cloud_session', JSON.stringify(session));
  }, [session]);

  const handleMainLogin = (email: string) => {
    setSession(prev => ({ ...prev, parentAuthenticated: true, mainAccountEmail: email }));
  };

  const handleAccountLogin = (accountId: string) => {
    setSession(prev => ({ ...prev, activeAccountId: accountId }));
  };

  const handleLogout = () => {
    setSession({ parentAuthenticated: false, activeAccountId: null, mainAccountEmail: null });
  };

  const handleSwitchAccount = (accountId: string) => {
    setSession(prev => ({ ...prev, activeAccountId: accountId }));
  };

  const activeAccount = STORAGE_ACCOUNTS.find(a => a.id === session.activeAccountId);
  const mainAccount = session.mainAccountEmail === MAIN_ACCOUNT.email ? MAIN_ACCOUNT : null;

  return (
    <ToastProvider>
      {!session.parentAuthenticated ? (
        <Login 
          accounts={STORAGE_ACCOUNTS} 
          mainAccount={MAIN_ACCOUNT}
          onMainLogin={handleMainLogin}
          onAccountLogin={handleAccountLogin} 
        />
      ) : (
        <Dashboard 
          activeAccount={activeAccount || STORAGE_ACCOUNTS[0]} 
          mainAccount={mainAccount}
          accounts={STORAGE_ACCOUNTS} 
          onLogout={handleLogout}
          onSwitchAccount={handleSwitchAccount}
        />
      )}
    </ToastProvider>
  );
}
