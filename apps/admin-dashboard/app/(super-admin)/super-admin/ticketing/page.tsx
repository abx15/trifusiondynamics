"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  LifeBuoy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
  Gauge,
  Building2,
  Flag,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface TicketingOverview {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  slaBreached: number;
  avgResolutionTimeHours: number;
  ticketsByOrg: { organizationId: string; _count: { id: number } }[];
  ticketsByStatus: { status: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];
}

interface Org {
  id: string;
  name: string;
  slug: string;
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "text-red-400 bg-red-500/10 border-red-500/30",
  ASSIGNED: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  IN_PROGRESS: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  RESOLVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  UNDER_VERIFICATION: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  CLOSED: "text-zinc-400 bg-zinc-500/10 border-zinc-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "text-red-400 bg-red-500/10 border-red-500/30",
  HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  LOW: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

export default function SuperAdminTicketingPage() {
  const [overview, setOverview] = useState<TicketingOverview | null>(null);
  const [orgMap, setOrgMap] = useState<Map<string, Org>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tickRes, orgsRes] = await Promise.all([
        apiClient.get("/super-admin/ticketing/overview"),
        apiClient.get("/users/organizations"),
      ]);
      setOverview(tickRes.data);
      const orgsData = Array.isArray(orgsRes.data) ? orgsRes.data : (orgsRes.data?.data || []);
      setOrgMap(new Map((orgsData as Org[]).map((o) => [o.id, o])));
    } catch (err: any) {
      console.error("Failed to load ticketing overview:", err);
      toast.error("Failed to load ticketing data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const orgName = (id: string) => orgMap.get(id)?.name ?? id;
  const resolutionRate =
    overview && overview.totalTickets > 0
      ? Math.round((overview.resolvedTickets / overview.totalTickets) * 100)
      : 0;

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/30">
            <LifeBuoy className="w-3 h-3" /> Helpdesk &amp; Automation
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Ticketing &amp; Automation
          </h1>
          <p className="text-xs text-zinc-400">
            Global ticket operations across all tenants — volume, SLA health, resolution performance and automation opportunities.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tickets</span>
            <LifeBuoy className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalTickets ?? 0}</p>
          <p className="text-[11px] text-zinc-500">Across all organizations</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Open / In Progress</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{overview?.openTickets ?? 0}</p>
          <p className="text-[11px] text-zinc-500">Awaiting resolution</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">SLA Breached</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{overview?.slaBreached ?? 0}</p>
          <p className="text-[11px] text-zinc-500">Resolution time exceeded</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Resolution</span>
            <Gauge className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.avgResolutionTimeHours ?? 0}h</p>
          <p className="text-[11px] text-emerald-400 font-medium">{resolutionRate}% resolution rate</p>
        </div>
      </div>

      {/* Automation opportunity banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Ticketing Automation</p>
            <p className="text-sm font-semibold text-white">
              Auto-route, auto-assign and SLA escalation workflows can be configured per organization from the Automation Center.
            </p>
          </div>
        </div>
        <a
          href="/super-admin/automation"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shrink-0"
        >
          <Zap className="w-4 h-4" /> Open Automation Center
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Status */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Tickets by Status
          </h2>
          <div className="space-y-2">
            {overview?.ticketsByStatus.map((t) => (
              <div key={t.status} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-700"}`}>
                  {t.status.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-bold text-white">{t.count}</span>
              </div>
            ))}
            {(!overview || overview.ticketsByStatus.length === 0) && !isLoading && (
              <p className="text-xs text-zinc-500 text-center py-6">No tickets yet.</p>
            )}
          </div>
        </div>

        {/* By Priority */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-400" /> Tickets by Priority
          </h2>
          <div className="space-y-2">
            {overview?.ticketsByPriority.map((t) => (
              <div key={t.priority} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[t.priority] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-700"}`}>
                  {t.priority}
                </span>
                <span className="text-sm font-bold text-white">{t.count}</span>
              </div>
            ))}
            {(!overview || overview.ticketsByPriority.length === 0) && !isLoading && (
              <p className="text-xs text-zinc-500 text-center py-6">No tickets yet.</p>
            )}
          </div>
        </div>

        {/* By Organization */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" /> Tickets by Organization
          </h2>
          <div className="space-y-3">
            {overview?.ticketsByOrg.map((row) => {
              const max = overview.ticketsByOrg[0]?._count.id ?? 1;
              return (
                <div key={row.organizationId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium truncate mr-2">{orgName(row.organizationId)}</span>
                    <span className="text-emerald-400 font-bold">{row._count.id}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(4, (row._count.id / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!overview || overview.ticketsByOrg.length === 0) && !isLoading && (
              <p className="text-xs text-zinc-500 text-center py-6">No ticket activity yet.</p>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}
    </div>
  );
}
