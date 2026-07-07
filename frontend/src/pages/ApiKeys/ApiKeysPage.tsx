import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Shield,
  Clock,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Dynamic Endpoint Handshake — fetches the current route token from the backend
 * to construct the moving endpoint URL for API keys.
 */
async function getKeysBaseUrl(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/auth/route-token`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      return `${API_URL}/api/keys/${data.routeToken}`;
    }
  } catch (err) {
    console.error("Failed to fetch route token:", err);
  }
  // Fallback — should not happen if admin is logged in
  return `${API_URL}/api/keys`;
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  usageToday: number;
  isActive: boolean;
}

const DURATION_OPTIONS = [
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "1y", label: "1 Year" },
  { value: "permanent", label: "Permanent" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getExpiryStatus(expiresAt: string | null, isExpired: boolean) {
  if (!expiresAt) return { label: "Permanent", color: "text-emerald-600 bg-emerald-50" };
  if (isExpired) return { label: "Expired", color: "text-red-600 bg-red-50" };
  const remaining = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  if (days <= 3) return { label: `${days}d left`, color: "text-amber-600 bg-amber-50" };
  return { label: formatDate(expiresAt), color: "text-gray-600 bg-gray-50" };
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<{ secretKey: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const baseUrl = await getKeysBaseUrl();
      const res = await fetch(baseUrl, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      const baseUrl = await getKeysBaseUrl();
      const res = await fetch(`${baseUrl}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error("Failed to delete key:", err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-violet-600" />
            </div>
            API Keys
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and manage collaboration keys for external access.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Generate Key
        </button>
      </div>

      {/* Key Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Secret Key</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Created</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Last Used</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600">Expires</th>
                <th className="text-center px-6 py-3.5 font-semibold text-gray-600">Usage (24h)</th>
                <th className="text-right px-6 py-3.5 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading keys...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-500">No API keys yet</p>
                    <p className="text-xs mt-1">Generate your first collaboration key to get started.</p>
                  </td>
                </tr>
              ) : (
                keys.map((k) => {
                  const expiry = getExpiryStatus(k.expiresAt, k.isExpired);
                  return (
                    <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{k.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2.5 py-1 rounded-lg font-mono text-gray-600">
                          {k.keyPrefix}••••••••
                        </code>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(k.createdAt)}</td>
                      <td className="px-6 py-4 text-gray-500">{formatRelative(k.lastUsedAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${expiry.color}`}>
                          {expiry.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-gray-700">{k.usageToday}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {deleteConfirm === k.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleDelete(k.id)}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(k.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Revoke key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {showModal && (
        <GenerateKeyModal
          onClose={() => {
            setShowModal(false);
            setNewKeyResult(null);
          }}
          onGenerated={(result) => {
            setNewKeyResult(result);
            fetchKeys();
          }}
          newKeyResult={newKeyResult}
          copied={copied}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
}

// --- Generate Key Modal ---
function GenerateKeyModal({
  onClose,
  onGenerated,
  newKeyResult,
  copied,
  onCopy,
}: {
  onClose: () => void;
  onGenerated: (result: { secretKey: string; name: string }) => void;
  newKeyResult: { secretKey: string; name: string } | null;
  copied: boolean;
  onCopy: (text: string) => void;
}) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("7d");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim()) return;
    setIsGenerating(true);
    try {
      const baseUrl = await getKeysBaseUrl();
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), duration }),
      });
      if (res.ok) {
        const data = await res.json();
        onGenerated({ secretKey: data.key.secretKey, name: data.key.name });
      }
    } catch (err) {
      console.error("Failed to generate key:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {newKeyResult ? "Key Generated!" : "Generate New Key"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {newKeyResult ? (
            /* Success State - Show the key */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Save this key now!</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    This is the only time you'll see this key. Copy and store it securely.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Key Name
                </label>
                <p className="text-sm font-medium text-gray-900 mt-1">{newKeyResult.name}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Secret Key
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-900 text-green-400 px-4 py-3 rounded-xl font-mono break-all select-all">
                    {newKeyResult.secretKey}
                  </code>
                  <button
                    onClick={() => onCopy(newKeyResult.secretKey)}
                    className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors flex-shrink-0 cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            /* Form State */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Key Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Partner A, Client Project..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Clock className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                  File Storage Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white cursor-pointer"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  Files uploaded with this key will be auto-deleted after this duration.
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!name.trim() || isGenerating}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isGenerating ? "Generating..." : "Generate Key"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
