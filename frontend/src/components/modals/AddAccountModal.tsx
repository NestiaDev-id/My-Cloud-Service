import React, { useState } from "react";
import { Modal } from "@/components/common";
import { useAccountStore, useUIStore } from "@/stores";
import { Home, Loader2 } from "lucide-react";

export const AddAccountModal: React.FC = () => {
  const { isAddAccountModalOpen, closeAddAccountModal } = useUIStore();
  const { getAuthUrl } = useAccountStore();
  const [accountName, setAccountName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = await getAuthUrl(accountName.trim() || undefined);
      // Redirect to Google OAuth
      window.location.href = url;
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isAddAccountModalOpen}
      onClose={closeAddAccountModal}
      title="Add Storage Account"
    >
      <form onSubmit={handleConnect} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="accountName"
            className="text-sm font-medium text-gray-700"
          >
            Account Label (Optional)
          </label>
          <input
            id="accountName"
            type="text"
            placeholder="e.g. Personal Drive, Work Account"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500">
            If empty, we'll use your Google profile name.
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mt-1">
            <Home className="w-4 h-4" />
          </div>
          <p className="text-sm text-blue-800 leading-relaxed">
            You will be redirected to Google to authorize access to your Drive.
            We only request access to manage files in your storage.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={closeAddAccountModal}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Home className="w-5 h-5" />
                Connect Google Account
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAccountModal;
