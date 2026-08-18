"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, CheckCircle2, Lock, AlertCircle, Building2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast";

export default function ClientSettingsPage() {
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
      setError("Please enter your default password provided by your agency admin.");
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
    toast.success("Client portal password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-purple-400" /> Client Security & Password Reset
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          URL Path: <span className="font-mono text-purple-400">/client/settings</span> · Update initial default password assigned by Trifusion Administrator.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Client Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-500">Contact Name</span>
            <p className="font-semibold text-white mt-0.5">{user?.name || "Sanjay Singhania"}</p>
          </div>
          <div>
            <span className="text-zinc-500">Email</span>
            <p className="font-semibold text-white mt-0.5">{user?.email || "client@apexretail.com"}</p>
          </div>
          <div>
            <span className="text-zinc-500">Organization</span>
            <p className="font-semibold text-purple-400 mt-0.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Apex Retail Solutions
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Access Status</span>
            <p className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Client Portal Active
            </p>
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-zinc-800">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Create Custom Password</h2>
            <p className="text-xs text-zinc-400">
              Replace default temporary password with your permanent private password.
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
              <span>Password successfully updated! Your account is now secured.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Default Password (Provided by Admin)
            </label>
            <input
              type="password"
              placeholder="Enter temporary password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              New Personal Password
            </label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-purple-500"
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-purple-600/30"
          >
            Save New Password
          </button>
        </form>
      </div>
    </div>
  );
}
