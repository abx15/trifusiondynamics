"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Crown,
  ShieldCheck,
  Briefcase,
  Headphones,
  Users,
  UserCheck,
  Laptop,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuthStore, getPrimaryRole, getRoleHomeRoute } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export const DEMO_PRESETS = [
  {
    key: "super_admin",
    label: "Super Admin",
    dept: "Executive",
    email: "trifusiondynamics@gmail.com",
    target: "/super-admin",
    icon: Crown,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    activeBg: "bg-amber-500/25 border-amber-400 ring-1 ring-amber-400/50",
  },
  {
    key: "admin",
    label: "Admin",
    dept: "Operations",
    email: "admin@trifusiondynamics.com",
    target: "/dashboard",
    icon: ShieldCheck,
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
    activeBg: "bg-purple-500/25 border-purple-400 ring-1 ring-purple-400/50",
  },
  {
    key: "sales_agent",
    label: "Sales",
    dept: "Partnerships",
    email: "sales.trifusion@gmail.com",
    target: "/crm",
    icon: Briefcase,
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    activeBg: "bg-blue-500/25 border-blue-400 ring-1 ring-blue-400/50",
  },
  {
    key: "support_agent",
    label: "Support",
    dept: "Helpdesk",
    email: "support.trifusion@gmail.com",
    target: "/tickets",
    icon: Headphones,
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10 hover:bg-cyan-500/20",
    activeBg: "bg-cyan-500/25 border-cyan-400 ring-1 ring-cyan-400/50",
  },
  {
    key: "hr_agent",
    label: "HR & People",
    dept: "Human Resources",
    email: "hr.trifusion@gmail.com",
    target: "/hr",
    icon: Users,
    color: "text-pink-400",
    border: "border-pink-500/30",
    bg: "bg-pink-500/10 hover:bg-pink-500/20",
    activeBg: "bg-pink-500/25 border-pink-400 ring-1 ring-pink-400/50",
  },
  {
    key: "agent",
    label: "Agent",
    dept: "Support Hub",
    email: "agent@trifusiondynamics.com",
    target: "/agent/dashboard",
    icon: UserCheck,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    activeBg: "bg-emerald-500/25 border-emerald-400 ring-1 ring-emerald-400/50",
  },
  {
    key: "employee",
    label: "Employee",
    dept: "Staff Ops",
    email: "bob.dev@trifusiondynamics.com",
    target: "/attendance",
    icon: Laptop,
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10 hover:bg-indigo-500/20",
    activeBg: "bg-indigo-500/25 border-indigo-400 ring-1 ring-indigo-400/50",
  },
  {
    key: "client",
    label: "Client",
    dept: "Tenant Portal",
    email: "client@apexretail.com",
    target: "/client/dashboard",
    icon: Building2,
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10 hover:bg-orange-500/20",
    activeBg: "bg-orange-500/25 border-orange-400 ring-1 ring-orange-400/50",
  },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const { setAuth } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const hasCheckedAuth = useRef(false);

  // Auto-redirect if already authenticated — run only once on mount
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    // Use getState() directly to avoid Zustand subscription re-renders
    const state = useAuthStore.getState();
    state.hydrateFromStorage();
    const storedUser = useAuthStore.getState().user;
    setIsCheckingAuth(false);
    
    if (storedUser) {
      const primaryRole = getPrimaryRole(storedUser.roles);
      const homeRoute = callbackUrl || getRoleHomeRoute(primaryRole);
      router.replace(homeRoute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: run only once on mount — prevents infinite re-render loop

  const handleSelectPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setSelectedPreset(preset.key);
    setIdentifier(preset.email);
    setPassword("");
    setError(null);
    toast.info(`Filled email for ${preset.label} (${preset.dept}) — enter password manually`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in both email and password");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post("/auth/login", {
        email: identifier.trim(),
        password: password,
      });

      const { user: loggedInUser, accessToken } = response.data;

      if (!loggedInUser || !accessToken) {
        throw new Error("Invalid response received from authentication server");
      }

      // Persist to Zustand store and browser storage
      setAuth(accessToken, loggedInUser);

      const primaryRole = getPrimaryRole(loggedInUser.roles);
      const targetRoute = callbackUrl || getRoleHomeRoute(primaryRole);

      setSuccess(`Authenticated as ${loggedInUser.name}! Routing to ${targetRoute}...`);
      toast.success(`Welcome back, ${loggedInUser.name}!`);

      setTimeout(() => {
        router.push(targetRoute);
      }, 400);
    } catch (err: any) {
      console.error("Login Error:", err);
      const serverMsg = err?.response?.data?.message || err?.message || "Login failed";
      if (err?.response?.status === 429 || serverMsg.includes("Too many failed attempts")) {
        setError("Too many failed attempts. Please wait 15 minutes before trying again.");
      } else if (err?.response?.status === 403 && serverMsg.includes("change your password")) {
        setError("You must change your password before continuing. Redirecting...");
        setTimeout(() => router.push("/settings"), 1500);
      } else if (err?.response?.status === 401) {
        setError("Invalid email or password. Please check your credentials.");
      } else {
        setError(serverMsg || "Authentication service unreachable. Please ensure the backend is active.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="w-full max-w-xl bg-[#0b0f19]/95 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden font-sans flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl bg-[#0b0f19]/95 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden font-sans">
      {/* Decorative ambient lighting */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Logo */}
      <div className="text-center mb-6 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20 mb-3">
          <div className="w-full h-full bg-[#070a13] rounded-[14px] flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Trifusion Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Trifusion-Dynamics</h1>
        <p className="text-xs text-purple-400 font-semibold tracking-wider uppercase mt-0.5">
          Enterprise Universal Access Portal
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Select a role preset below for 1-click login or enter your account credentials
        </p>
      </div>

      {/* 8-Role Quick-Fill Preset Buttons */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Demo Role Presets (1-Click Fill)
          </span>
          <span className="text-[10px] text-slate-500">Click to autofill</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DEMO_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  preset.border
                } ${isSelected ? preset.activeBg : preset.bg}`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <Icon className={`w-3.5 h-3.5 ${preset.color} shrink-0`} />
                  <span className={`text-xs font-bold ${preset.color} truncate`}>
                    {preset.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                  {preset.dept}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-red-200 text-xs animate-shake relative z-10">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs relative z-10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            Email Address or Phone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@trifusiondynamics.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <span
              onClick={() => toast.info("Use preset buttons above or reset with your system admin.")}
              className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer transition-colors"
            >
              Forgot password?
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying & Signing In...</span>
            </>
          ) : (
            <span>Sign In to Unified Workspace</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
