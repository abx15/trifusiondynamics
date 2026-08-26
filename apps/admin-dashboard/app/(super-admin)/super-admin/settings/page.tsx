"use client";

import React, { useState } from "react";
import {
  Settings,
  Shield,
  Save,
  Cpu,
  Lock,
  Globe,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/lib/toast";

export default function SuperAdminSettingsPage() {
  const [platformName, setPlatformName] = useState("AgencyOS / Trifusion-Dynamics");
  const [adminNotificationEmail, setAdminNotificationEmail] = useState("trifusiondynamics@gmail.com");
  const [activeLlmProvider, setActiveLlmProvider] = useState("gemini");
  const [jwtTokenExpiry, setJwtTokenExpiry] = useState("3600");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Global system settings persisted successfully!");
    }, 600);
  };

  return (
    <div className="space-y-6 font-sans text-white max-w-4xl">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
          <Settings className="w-3 h-3" /> Root Platform Configuration
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Global Enterprise Settings
        </h1>
        <p className="text-xs text-zinc-400">
          Configure cross-tenant policies, AI providers, session security, and global defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Platform Identity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                SuperAdmin Alert Email
              </label>
              <input
                type="email"
                value={adminNotificationEmail}
                onChange={(e) => setAdminNotificationEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* AI Engine Settings */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> AI Engine & LLM Orchestration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "gemini", label: "Google Gemini 1.5 Pro", desc: "Recommended for high context" },
              { id: "anthropic", label: "Anthropic Claude 3.5", desc: "Advanced reasoning & code" },
              { id: "openai", label: "OpenAI GPT-4o", desc: "General multimodal" },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveLlmProvider(p.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeLlmProvider === p.id
                    ? "bg-purple-500/15 border-purple-500 text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  {p.label}
                  {activeLlmProvider === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Token Policy */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Session & Token Expiration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Access Token Duration (Seconds)
              </label>
              <input
                type="number"
                value={jwtTokenExpiry}
                onChange={(e) => setJwtTokenExpiry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Refresh Token Retention
              </label>
              <input
                type="text"
                disabled
                value="7 Days (Auto-Revoked upon New Login)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80 text-xs text-zinc-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save Global Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
