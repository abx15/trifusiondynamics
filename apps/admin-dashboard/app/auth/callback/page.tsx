"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuthStore, getPrimaryRole, getRoleHomeRoute } from "@/lib/auth-store";
import { toast } from "@/lib/toast";


function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const exchangeCode = searchParams.get("code");

    if (!exchangeCode) {
      setStatus("error");
      setErrorMessage("No exchange code provided. Please try logging in again.");
      return;
    }

    const exchangeCodeForToken = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

        const response = await fetch(`${API_URL}/auth/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: exchangeCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Exchange code validation failed");
        }

        const data = await response.json();

        // Persist to sessionStorage and update Zustand store
        if (data.user && data.accessToken) {
          setAuth(data.accessToken, data.user);
        }

        toast.success("Login successful");

        setStatus("success");

        // Role-based routing
        const primaryRole = getPrimaryRole(data.user.roles);
        const redirectPath = getRoleHomeRoute(primaryRole);

        setTimeout(() => {
          router.push(redirectPath);
        }, 400);

      } catch (error: any) {
        console.error("Exchange code error:", error);
        setStatus("error");
        setErrorMessage(error.message || "Login link expired. Please try again.");
      }
    };

    exchangeCodeForToken();
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
            <p className="text-slate-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // Will redirect to dashboard
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Authenticating...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
