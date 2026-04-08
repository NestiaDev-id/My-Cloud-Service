import React, { useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck, ChevronRight, Cloud } from "lucide-react";

interface LoginProps {
  onAccountLogin: (accountId: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMainLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      // Fetch OAuth URL for Admin login
      const response = await fetch(`${API_URL}/api/auth/url?name=Admin`);
      if (!response.ok) throw new Error("Gagal mengambil URL autentikasi");
      const { url } = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = url;
    } catch (err) {
      setError("Gagal terhubung ke sistem login Google. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Cloud className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            My Cloud Service
          </h1>
          <p className="text-gray-500 mt-2">Secure multi-account storage</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-blue-600 w-6 h-6" />
            <h2 className="text-xl font-semibold text-gray-800">
              Admin Login
            </h2>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-800 leading-relaxed">
              Gunakan akun **Google Root** Anda untuk masuk ke dashboard admin dan mengelola storage.
            </p>
          </div>

          <form onSubmit={handleMainLogin} className="space-y-4">
            {error && (
              <p className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Masuk dengan Google <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

