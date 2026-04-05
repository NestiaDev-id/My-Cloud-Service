import { useState, useEffect } from 'react';
import type { Account, UserSession } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { ToastProvider } from './components/Toast';

const MOCK_ACCOUNTS: Account[] = [
  { 
    id: 'acc_1', 
    name: 'Personal Account', 
    email: 'personal@cloud.com', 
    avatar: 'P', 
    color: 'bg-blue-500', 
    status: 'connected', 
    lastCheck: '2024-03-22T10:00:00Z',
    usedStorage: 10 * 1024 * 1024 * 1024, // 10 GB
    totalStorage: 15 * 1024 * 1024 * 1024 // 15 GB
  },
  { 
    id: 'acc_2', 
    name: 'Work Account', 
    email: 'work@company.com', 
    avatar: 'W', 
    color: 'bg-indigo-600', 
    status: 'connected', 
    lastCheck: '2024-03-22T10:05:00Z',
    usedStorage: 45 * 1024 * 1024 * 1024, // 45 GB
    totalStorage: 100 * 1024 * 1024 * 1024 // 100 GB
  },
  { 
    id: 'acc_3', 
    name: 'Shared Family', 
    email: 'family@home.com', 
    avatar: 'F', 
    color: 'bg-emerald-500', 
    status: 'disconnected', 
    lastCheck: '2024-03-22T09:30:00Z',
    usedStorage: 2 * 1024 * 1024 * 1024, // 2 GB
    totalStorage: 5 * 1024 * 1024 * 1024 // 5 GB
  },
  { 
    id: 'acc_4', 
    name: 'Backup Server', 
    email: 'backup@storage.com', 
    avatar: 'B', 
    color: 'bg-amber-500', 
    status: 'connected', 
    lastCheck: '2024-03-22T10:10:00Z',
    usedStorage: 450 * 1024 * 1024 * 1024, // 450 GB
    totalStorage: 1024 * 1024 * 1024 * 1024 // 1 TB
  },
];

export default function App() {
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('cloud_session');
    return saved ? JSON.parse(saved) : { parentAuthenticated: false, activeAccountId: null };
  });

  useEffect(() => {
    localStorage.setItem('cloud_session', JSON.stringify(session));
  }, [session]);

  const handleLogin = (accountId: string) => {
    setSession({ parentAuthenticated: true, activeAccountId: accountId });
  };

  const handleLogout = () => {
    setSession({ parentAuthenticated: false, activeAccountId: null });
  };

  const handleSwitchAccount = (accountId: string) => {
    setSession(prev => ({ ...prev, activeAccountId: accountId }));
  };

  const activeAccount = MOCK_ACCOUNTS.find(a => a.id === session.activeAccountId);

  return (
    <ToastProvider>
      {!session.parentAuthenticated || !activeAccount ? (
        <Login accounts={MOCK_ACCOUNTS} onLogin={handleLogin} />
      ) : (
        <Dashboard 
          activeAccount={activeAccount} 
          accounts={MOCK_ACCOUNTS} 
          onLogout={handleLogout}
          onSwitchAccount={handleSwitchAccount}
        />
      )}
    </ToastProvider>
  );
}
