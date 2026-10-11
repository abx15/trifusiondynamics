"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, ShieldCheck, Server, Users, Activity, Key, CheckCircle, Loader2, Workflow, BrainCircuit, LifeBuoy, ArrowUpRight } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface SuperAdminStats {
  totalOrganizations: number;
  totalUsers: number;
  activeOrganizations: number;
  servicesHealth: {
    auth: boolean;
    ai: boolean;
    database: boolean;
    redis: boolean;
  };
}

interface AutomationOverview {
  totalWorkflows: number;
  activeWorkflows: number;
  totalRuns: number;
  runsByStatus: { status: string; count: number }[];
}

interface AiOverview {
  totalProposals: number;
  totalAudits: number;
  totalEmails: number;
  totalSummaries: number;
}

interface TicketingOverview {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  slaBreached: number;
  avgResolutionTimeHours: number;
}

export default function SuperAdminDashboard() {
  const user = useAuthStore((state) => state.user);

  const isSuperAdmin = !!user?.roles?.some((r) => ["super_admin", "superadmin"].includes(r.toLowerCase()));

  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get("/super-admin/stats");
      return data as SuperAdminStats;
    },
    enabled: isSuperAdmin,
    staleTime: 30_000,
  });

  const { data: automation } = useQuery({
    queryKey: ["super-admin-automation-overview"],
    queryFn: async () => {
      const { data } = await apiClient.get("/super-admin/automation/overview");
      return data as AutomationOverview;
    },
    enabled: isSuperAdmin,
    staleTime: 30_000,
  });

  const { data: ai } = useQuery({
    queryKey: ["super-admin-ai-overview"],
    queryFn: async () => {
      const { data } = await apiClient.get("/super-admin/ai/overview");
      return data as AiOverview;
    },
    enabled: isSuperAdmin,
    staleTime: 30_000,
  });

  const { data: ticketing } = useQuery({
    queryKey: ["super-admin-ticketing-overview"],
    queryFn: async () => {
      const { data } = await apiClient.get("/super-admin/ticketing/overview");
      return data as TicketingOverview;
    },
    enabled: isSuperAdmin,
    staleTime: 30_000,
  });

  const aiTotal = (ai?.totalProposals ?? 0) + (ai?.totalAudits ?? 0) + (ai?.totalEmails ?? 0) + (ai?.totalSummaries ?? 0);
  const automationSuccess = automation?.runsByStatus.find((r) => r.status === "SUCCESS")?.count ?? 0;
  const automationRate = automation?.totalRuns ? Math.round((automationSuccess / automation.totalRuns) * 100) : 0;

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
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            </div>
          ))
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Tenant Organizations</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.totalOrganizations ?? 0}</p>
              <p className="text-[11px] text-emerald-400 font-medium">{stats?.activeOrganizations ?? 0} Active</p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">System Users</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.totalUsers ?? 0}</p>
              <p className="text-[11px] text-purple-400 font-medium">Across all organizations</p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Services Health</span>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {stats?.servicesHealth ? Object.values(stats.servicesHealth).filter(Boolean).length : 0} / 4 Online
              </p>
              <p className="text-[11px] text-blue-400 font-medium">Auth, AI, Database, Redis</p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Security Engine</span>
                <Key className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">HttpOnly JWT</p>
              <p className="text-[11px] text-emerald-400 font-medium">Cookie rotation enabled</p>
            </div>
          </>
        )}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" /> Super Admin Executive Management Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
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
          </Link>

          <Link
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
          </Link>

          <Link
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
          </Link>

          <Link
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
          </Link>
        </div>
      </div>

      {/* Platform Analysis Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" /> Platform Analysis — AI, Automation &amp; Ticketing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Automation Analysis */}
          <Link
            href="/super-admin/automation"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-violet-500/50 transition-all block group space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Workflow className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white group-hover:text-violet-300 transition-colors">
                Automation Analysis
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                What automation is doing and what it can do across every tenant.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80">
              <div>
                <p className="text-lg font-bold text-white">{automation?.totalWorkflows ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Workflows</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">{automation?.activeWorkflows ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Active</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">{automationRate}%</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Success</p>
              </div>
            </div>
          </Link>

          {/* AI Analysis */}
          <Link
            href="/super-admin/ai"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/50 transition-all block group space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                AI Analysis
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                AI usage across proposals, SEO audits, emails and summaries.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
              <div>
                <p className="text-lg font-bold text-white">{aiTotal}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Total AI Tasks</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-400">{ai?.totalProposals ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Proposals</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">{ai?.totalAudits ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">SEO Audits</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-400">{ai?.totalEmails ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Email Drafts</p>
              </div>
            </div>
          </Link>

          {/* Ticketing Analysis */}
          <Link
            href="/super-admin/ticketing"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 transition-all block group space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                Ticketing &amp; Automation
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Ticket volume, SLA health and automation opportunities.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80">
              <div>
                <p className="text-lg font-bold text-white">{ticketing?.totalTickets ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-400">{ticketing?.openTickets ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Open</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-400">{ticketing?.slaBreached ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">SLA Breached</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
