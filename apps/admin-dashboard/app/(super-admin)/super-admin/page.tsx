"use client";

import * as React from "react";
import { Crown, ShieldCheck, Server, Users, Activity, Key, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export default function SuperAdminDashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-8 font-sans text-white">
      {/* Header Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
              <Crown className="w-3.5 h-3.5" /> Highest System Privilege
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Super Admin Executive Portal
            </h1>
            <p className="text-zinc-400 text-sm max-w-xl">
              Welcome back, <span className="text-amber-400 font-semibold">{user?.name || "Super Admin"}</span>. Full administrative access across all tenant organizations and microservices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-right">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Global Status</p>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 justify-end">
                <CheckCircle className="w-4 h-4" /> All Systems Operational
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* High Level Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tenant Organizations</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">12 Active</p>
          <p className="text-[11px] text-emerald-400 font-medium">+2 registered this month</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">System Users</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">1,480 Users</p>
          <p className="text-[11px] text-purple-400 font-medium">SUPER_ADMIN, ADMIN, AGENT, CLIENT</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Services Health</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">4 / 4 Online</p>
          <p className="text-[11px] text-blue-400 font-medium">Auth, Next.js CRM, Web, AI Service</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Security Engine</span>
            <Key className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">HttpOnly JWT</p>
          <p className="text-[11px] text-emerald-400 font-medium">Cookie rotation enabled</p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" /> Super Admin Executive Management Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/super-admin/organizations"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 transition-all block group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-zinc-500 group-hover:text-amber-400 text-xs font-bold">Manage &rarr;</span>
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">Organizations</h3>
            <p className="text-xs text-zinc-400 mt-1">Multi-tenant instances, tenant creation & quotas.</p>
          </a>

          <a
            href="/super-admin/rbac"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 transition-all block group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-zinc-500 group-hover:text-purple-400 text-xs font-bold">Manage &rarr;</span>
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors">Universal RBAC</h3>
            <p className="text-xs text-zinc-400 mt-1">Roles assignment, permissions matrix, password reset.</p>
          </a>

          <a
            href="/super-admin/system"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-blue-500/50 transition-all block group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-zinc-500 group-hover:text-blue-400 text-xs font-bold">Manage &rarr;</span>
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-blue-300 transition-colors">Infrastructure</h3>
            <p className="text-xs text-zinc-400 mt-1">Live service health, database latency, cluster metrics.</p>
          </a>

          <a
            href="/super-admin/settings"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 transition-all block group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Key className="w-5 h-5" />
              </div>
              <span className="text-zinc-500 group-hover:text-emerald-400 text-xs font-bold">Manage &rarr;</span>
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors">Global Settings</h3>
            <p className="text-xs text-zinc-400 mt-1">AI models, token expiration, master platform policies.</p>
          </a>
        </div>
      </div>
    </div>
  );
}
