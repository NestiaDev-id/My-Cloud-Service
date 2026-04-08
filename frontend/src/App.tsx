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
import { useAccountStore, useFileStore } from "./stores";

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

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: any }
> {
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
          <h1 className="text-2xl font-bold mb-4">
            Aplikasi Mengalami Kendala (Crash)
          </h1>
          <pre className="p-4 bg-white border border-red-200 rounded-lg overflow-auto">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => (window.location.href = "/")}
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
  const {
    accounts,
    isLoading: accountsLoading,
    fetchAccounts,
  } = useAccountStore();
  const { fetchFiles } = useFileStore();

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

  // Fetch accounts on mount or session change
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/me`, {
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          setSession(prev => ({
            ...prev,
            parentAuthenticated: true,
            mainAccountEmail: data.user.email
          }));
        } else {
          setSession(prev => ({ ...prev, parentAuthenticated: false }));
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (session.parentAuthenticated) {
      fetchAccounts();
      fetchFiles();
    }
  }, [session.parentAuthenticated, fetchAccounts, fetchFiles]);

  useEffect(() => {
    localStorage.setItem("cloud_session", JSON.stringify(session));
  }, [session]);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
    
    setSession({
      parentAuthenticated: false,
      activeAccountId: null,
      mainAccountEmail: null,
    });
  };

  const activeAccount = accounts.find((a) => a.id === session.activeAccountId);
  
  // Create a fake main account object for UI compatibility
  const mainAccount = session.parentAuthenticated ? {
    ...MAIN_ACCOUNT,
    email: session.mainAccountEmail || MAIN_ACCOUNT.email
  } : null;

  // Show loading while fetching accounts
  if (session.parentAuthenticated && accountsLoading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat akun storage...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        {!session.parentAuthenticated ? (
          <Login />
        ) : (
          <Routes>
            <Route
              element={
                <Layout
                  activeAccount={activeAccount || accounts[0]}
                  mainAccount={mainAccount}
                  accounts={accounts}
                  onLogout={handleLogout}
                />
              }
            >
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
