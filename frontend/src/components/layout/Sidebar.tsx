import { NavLink } from "react-router-dom";
import {
  Plus,
  HardDrive,
  Clock,
  Share2,
  Trash2,
  Activity,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSize } from "@/utils";

interface SidebarProps {
  onNewClick: () => void;
  totalUsed: number;
  totalCapacity: number;
}

const NAV_ITEMS = [
  { id: "drive", to: "/drive", icon: <HardDrive className="w-5 h-5" />, label: "My Drive" },
  {
    id: "monitoring",
    to: "/monitoring",
    icon: <Activity className="w-5 h-5" />,
    label: "Monitoring",
  },
  { id: "recent", to: "/recent", icon: <Clock className="w-5 h-5" />, label: "Recent" },
  { id: "shared", to: "/shared", icon: <Share2 className="w-5 h-5" />, label: "Shared" },
  { id: "trash", to: "/trash", icon: <Trash2 className="w-5 h-5" />, label: "Trash" },
];

export const Sidebar: React.FC<SidebarProps> = ({
  onNewClick,
  totalUsed,
  totalCapacity,
}) => {
  const usagePercent = Math.round((totalUsed / totalCapacity) * 100);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Cloud className="text-white w-6 h-6" />
        </div>
        <span className="font-bold text-xl text-gray-900 tracking-tight">
          My Cloud
        </span>
      </div>

      <div className="px-4 mb-6">
        <button
          onClick={onNewClick}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3 transition-all group cursor-pointer"
        >
          <Plus className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          New
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
            <span>Combined Storage</span>
            <span>{usagePercent}% used</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400">
            {formatSize(totalUsed)} of {formatSize(totalCapacity)} used
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
