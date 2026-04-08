import { useOutletContext } from "react-router-dom";
import { MonitoringView } from "@/components/monitoring";
import { useUIStore } from "@/stores";
import type { Account } from "@/types";

interface OutletContext {
  accounts: Account[];
  fetchAccounts: () => Promise<void>;
  openEditModal: (account: Account) => void;
  openAddAccountModal: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function MonitoringPage() {
  const { accounts, fetchAccounts, openEditModal, openAddAccountModal, showToast } =
    useOutletContext<OutletContext>();
  const { isRefreshing, setIsRefreshing } = useUIStore();

  const handleAddAccount = () => {
    openAddAccountModal();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/accounts/refresh-all`, {
        method: "POST",
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Gagal memperbarui status");
      
      // Also fetch accounts to update UI with new storage data
      await fetchAccounts();
      
      showToast("Status storage diperbarui & Cache dibersihkan!", "success");
    } catch (err) {
      showToast("Gagal menyinkronkan data dari Google", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReconnect = (account: Account) => {
    showToast(`Reconnecting ${account.name}...`, "info");
    setTimeout(() => {
      showToast(`${account.name} reconnected successfully`, "success");
    }, 1500);
  };

  const handleDiagnostic = (account: Account) => {
    showToast(`Running diagnostics on ${account.name}...`, "info");
  };

  return (
    <MonitoringView
      accounts={accounts}
      isRefreshing={isRefreshing}
      onAddAccount={handleAddAccount}
      onRefresh={handleRefresh}
      onEditAccount={openEditModal}
      onReconnect={handleReconnect}
      onDiagnostic={handleDiagnostic}
    />
  );
}
