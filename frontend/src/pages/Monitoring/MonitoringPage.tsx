import { useOutletContext } from "react-router-dom";
import { MonitoringView } from "@/components/monitoring";
import { useUIStore } from "@/stores";
import type { Account } from "@/types";

interface OutletContext {
  accounts: Account[];
  openEditModal: (account: Account) => void;
  openAddAccountModal: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function MonitoringPage() {
  const { accounts, openEditModal, openAddAccountModal, showToast } =
    useOutletContext<OutletContext>();
  const { isRefreshing, setIsRefreshing } = useUIStore();

  const handleAddAccount = () => {
    openAddAccountModal();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Account status refreshed", "success");
    }, 2000);
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
