import React from "react";
import { Search, Grid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import type { Account } from "@/types";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  activeAccount: Account;
  mainAccount: Account | null;
  isAccountMenuOpen: boolean;
  onAccountMenuToggle: () => void;
  onAccountMenuClose: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  activeAccount,
  mainAccount,
  isAccountMenuOpen,
  onAccountMenuToggle,
  onAccountMenuClose,
  onLogout,
}) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
      <div className="flex-1 max-w-2xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search in Drive"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-sm"
        />
      </div>

      <div className="flex items-center gap-4 ml-4">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "list"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        <AccountMenu
          isOpen={isAccountMenuOpen}
          onToggle={onAccountMenuToggle}
          onClose={onAccountMenuClose}
          onLogout={onLogout}
          activeAccount={activeAccount}
          mainAccount={mainAccount}
        />
      </div>
    </header>
  );
};

export default Header;
