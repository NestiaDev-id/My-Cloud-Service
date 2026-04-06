import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { Account, UserSession } from "./types";
import Login from "./components/Login";
import { Layout } from "./components/layout";
import DrivePage from "./pages/Drive/DrivePage";
import RecentPage from "./pages/Recent/RecentPage";
import SharedPage from "./pages/Shared/SharedPage";
import TrashPage from "./pages/Trash/TrashPage";
import MonitoringPage from "./pages/Monitoring/MonitoringPage";
import { ToastProvider } from "./components/Toast";

const STORAGE_ACCOUNTS: Account[] = [
  {
    id: "acc_a",
    name: "Storage Account A",
    email: "account_a@storage.com",
    avatar: "A",
    color: "bg-blue-500",
    status: "connected",
    lastCheck: "2024-03-22T10:00:00Z",
    usedStorage: 10 * 1024 * 1024 * 1024,
    totalStorage: 15 * 1024 * 1024 * 1024,
  },
  {
    id: "acc_b",
    name: "Storage Account B",
    email: "account_b@storage.com",
    avatar: "B",
    color: "bg-indigo-600",
    status: "connected",
    lastCheck: "2024-03-22T10:05:00Z",
    usedStorage: 45 * 1024 * 1024 * 1024,
    totalStorage: 100 * 1024 * 1024 * 1024,
  },
  {
    id: "acc_c",
    name: "Storage Account C",
    email: "account_c@storage.com",
    avatar: "C",
    color: "bg-emerald-500",
    status: "disconnected",
    lastCheck: "2024-03-22T09:30:00Z",
    usedStorage: 2 * 1024 * 1024 * 1024,
    totalStorage: 5 * 1024 * 1024 * 1024,
  },
];

const MAIN_ACCOUNT: Account = {
  id: "main_root",
  name: "Admin Sistem",
  email: "admin@cloudservice.com",
  avatar: "Admin",
  color: "bg-slate-900",
  status: "connected",
  lastCheck: new Date().toISOString(),
  usedStorage: 0,
  totalStorage: 0,
  isMainAccount: true,
};

import { Component, type ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 text-red-800 min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Aplikasi Mengalami Kendala (Crash)</h1>
          <pre className="p-4 bg-white border border-red-200 rounded-lg overflow-auto">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem("cloud_session");
    return saved
      ? JSON.parse(saved)
      : {
          parentAuthenticated: false,
          activeAccountId: null,
          mainAccountEmail: null,
        };
  });

  useEffect(() => {
    localStorage.setItem("cloud_session", JSON.stringify(session));
  }, [session]);

  const handleMainLogin = (email: string) => {
    setSession((prev) => ({
      ...prev,
      parentAuthenticated: true,
      mainAccountEmail: email,
    }));
  };

  const handleAccountLogin = (accountId: string) => {
    setSession((prev) => ({ ...prev, activeAccountId: accountId }));
  };

  const handleLogout = () => {
    setSession({
      parentAuthenticated: false,
      activeAccountId: null,
      mainAccountEmail: null,
    });
  };

  const activeAccount = STORAGE_ACCOUNTS.find(
    (a) => a.id === session.activeAccountId,
  );
  const mainAccount =
    session.mainAccountEmail === MAIN_ACCOUNT.email ? MAIN_ACCOUNT : null;

  return (
    <ToastProvider>
      <ErrorBoundary>
        {!session.parentAuthenticated ? (
          <Login
            accounts={STORAGE_ACCOUNTS}
            mainAccount={MAIN_ACCOUNT}
            onMainLogin={handleMainLogin}
            onAccountLogin={handleAccountLogin}
          />
        ) : (
          <Routes>
            <Route element={
              <Layout
                activeAccount={activeAccount || STORAGE_ACCOUNTS[0]}
                mainAccount={mainAccount}
                accounts={STORAGE_ACCOUNTS}
                onLogout={handleLogout}
              />
            }>
              <Route path="/" element={<Navigate to="/drive" replace />} />
              <Route path="/drive" element={<DrivePage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/recent" element={<RecentPage />} />
              <Route path="/shared" element={<SharedPage />} />
              <Route path="/trash" element={<TrashPage />} />
            </Route>
          </Routes>
        )}
      </ErrorBoundary>
    </ToastProvider>
  );
}
