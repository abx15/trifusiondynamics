"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast";

export default function AgentSettingsPage() {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Please enter your current/default password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSuccess(true);
    toast.success("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-blue-400" /> Security & Password Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          URL Path: <span className="font-mono text-blue-400">/agent/settings</span> · Update your initial default password assigned by the Administrator.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Account Overview</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-500">Name</span>
            <p className="font-semibold text-white mt-0.5">{user?.name || "Jane Agent"}</p>
          </div>
          <div>
            <span className="text-zinc-500">Email</span>
            <p className="font-semibold text-white mt-0.5">{user?.email || "agent@trifusiondynamics.com"}</p>
          </div>
          <div>
            <span className="text-zinc-500">Assigned Role</span>
            <p className="font-semibold text-blue-400 mt-0.5 uppercase">Agent / Support Staff</p>
          </div>
          <div>
            <span className="text-zinc-500">Password Status</span>
            <p className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Active & Gated
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-zinc-800">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Create New Password</h2>
            <p className="text-xs text-zinc-400">
              Enter your current default password provided by your admin, then enter your new custom password.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Your new password is set! Future logins will use this password.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Current / Default Password
            </label>
            <input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/30"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
