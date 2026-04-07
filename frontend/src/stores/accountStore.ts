import { create } from "zustand";
import type { Account } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface AccountState {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAccounts: () => Promise<void>;
  refreshAccount: (accountId: string) => Promise<void>;
  refreshAllAccounts: () => Promise<void>;
  updateAccount: (accountId: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  getAuthUrl: (name?: string) => Promise<string>;
}

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/accounts`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const data = await response.json();
      set({ accounts: data.accounts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  refreshAccount: async (accountId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/accounts/${accountId}/refresh`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to refresh account");
      const data = await response.json();
      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === accountId ? data.account : a,
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  refreshAllAccounts: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_URL}/api/accounts/refresh-all`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to refresh accounts");
      const data = await response.json();
      set({ accounts: data.accounts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateAccount: async (accountId: string, data: Partial<Account>) => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update account");
      const result = await response.json();
      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === accountId ? result.account : a,
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteAccount: async (accountId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete account");
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== accountId),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getAuthUrl: async (name?: string) => {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    const response = await fetch(`${API_URL}/api/auth/url?${params}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to get auth URL");
    const data = await response.json();
    return data.url;
  },
}));
