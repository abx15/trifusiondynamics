"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Clock,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Server,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/lib/auth-store";

interface WorkflowItem {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: any;
  actions: any[];
  isActive: boolean;
  organizationId: string;
  organization: { id: string; name: string; slug: string; isActive: boolean } | null;
  totalRuns: number;
  lastRun: { id: string; status: string; startedAt: string; errorMessage: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface AutomationOverview {
  totalWorkflows: number;
  activeWorkflows: number;
  totalRuns: number;
  runsByStatus: { status: string; count: number }[];
  recentRuns: {
    id: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    errorMessage: string | null;
    workflow: { id: string; name: string; organizationId: string };
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  FAILED: "text-red-400 bg-red-500/10 border-red-500/30",
  RUNNING: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const TRIGGER_COLORS: Record<string, string> = {
  MANUAL: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  EVENT: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  SCHEDULED: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
};

export default function SuperAdminAutomationPage() {
  const user = useAuthStore((state) => state.user);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [overview, setOverview] = useState<AutomationOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [wfRes, ovRes] = await Promise.all([
        apiClient.get("/super-admin/automation/workflows"),
        apiClient.get("/super-admin/automation/overview"),
      ]);
      setWorkflows(Array.isArray(wfRes.data) ? wfRes.data : []);
      setOverview(ovRes.data);
    } catch (err: any) {
      console.error("Failed to load automation data:", err);
      toast.error("Failed to load automation data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (wf: WorkflowItem) => {
    setTogglingId(wf.id);
    try {
      await apiClient.patch(`/super-admin/automation/workflows/${wf.id}/toggle`);
      toast.success(
        `Workflow "${wf.name}" ${wf.isActive ? "deactivated" : "activated"}`
      );
      fetchData();
    } catch (err: any) {
      console.error("Toggle error:", err);
      toast.error(err?.response?.data?.message || "Failed to toggle workflow");
    } finally {
      setTogglingId(null);
    }
  };

  const handleTrigger = async (wf: WorkflowItem) => {
    setTriggeringId(wf.id);
    try {
      await apiClient.post(`/super-admin/automation/workflows/${wf.id}/trigger`);
      toast.success(`Workflow "${wf.name}" triggered`);
      setTimeout(fetchData, 1500);
    } catch (err: any) {
      console.error("Trigger error:", err);
      toast.error(err?.response?.data?.message || "Failed to trigger workflow");
    } finally {
      setTriggeringId(null);
    }
  };

  const successRuns = overview?.runsByStatus.find((r) => r.status === "SUCCESS")?.count ?? 0;
  const successRate = overview?.totalRuns ? Math.round((successRuns / overview.totalRuns) * 100) : 0;

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider mb-2 border border-violet-500/30">
            <Workflow className="w-3 h-3" /> Automation Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Automation Center
          </h1>
          <p className="text-xs text-zinc-400">
            Global view of every workflow across all tenant organizations — monitor runs, toggle active state, and trigger manual workflows.
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
            <span className="text-xs font-semibold uppercase tracking-wider">Total Workflows</span>
            <Workflow className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalWorkflows ?? 0}</p>
          <p className="text-[11px] text-zinc-500">Across all organizations</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Workflows</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{overview?.activeWorkflows ?? 0}</p>
          <p className="text-[11px] text-zinc-500">
            {overview?.totalWorkflows ? Math.round((overview.activeWorkflows / overview.totalWorkflows) * 100) : 0}% of total
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Runs</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalRuns ?? 0}</p>
          <p className="text-[11px] text-zinc-500">Executions recorded</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{successRate}%</p>
          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${successRate}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows Table */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-400" /> All Workflows (Cross-Organization)
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800">
              <Workflow className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No workflows found across any organization.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-violet-500/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-white truncate">{wf.name}</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${TRIGGER_COLORS[wf.triggerType] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-700"}`}>
                          {wf.triggerType}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${wf.isActive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-zinc-500 bg-zinc-500/10 border-zinc-700"}`}>
                          {wf.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Org: <span className="text-zinc-300">{wf.organization?.name ?? wf.organizationId}</span>
                        {" "}·{" "}
                        <span className="text-zinc-400">{wf.totalRuns} runs</span>
                        {" "}·{" "}
                        {wf.actions?.length ?? 0} actions
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(wf)}
                        disabled={togglingId === wf.id}
                        title={wf.isActive ? "Deactivate workflow" : "Activate workflow"}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {togglingId === wf.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : wf.isActive ? (
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleTrigger(wf)}
                        disabled={triggeringId === wf.id || !wf.isActive || wf.triggerType !== "MANUAL"}
                        title={wf.triggerType !== "MANUAL" ? "Only MANUAL workflows can be triggered" : "Trigger workflow now"}
                        className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 text-violet-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {triggeringId === wf.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {wf.lastRun && (
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <Clock className="w-3 h-3" />
                      Last run:{" "}
                      <span className={`font-semibold ${wf.lastRun.status === "SUCCESS" ? "text-emerald-400" : wf.lastRun.status === "FAILED" ? "text-red-400" : "text-blue-400"}`}>
                        {wf.lastRun.status}
                      </span>
                      {" "}· {new Date(wf.lastRun.startedAt).toLocaleString()}
                      {wf.lastRun.errorMessage && (
                        <span className="text-red-400 truncate ml-2">{wf.lastRun.errorMessage}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Runs */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Recent Runs
          </h2>
          <div className="space-y-2">
            {overview?.runsByStatus.map((r) => (
              <div key={r.status} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-700"}`}>
                  {r.status === "SUCCESS" && <CheckCircle2 className="w-3 h-3" />}
                  {r.status === "FAILED" && <XCircle className="w-3 h-3" />}
                  {r.status === "RUNNING" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {r.status}
                </span>
                <span className="text-sm font-bold text-white">{r.count}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {overview?.recentRuns.map((run) => (
              <div key={run.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">{run.workflow.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[run.status] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-700"}`}>
                    {run.status}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(run.startedAt).toLocaleString()}
                  {run.errorMessage && <span className="text-red-400 truncate">· {run.errorMessage}</span>}
                </p>
              </div>
            ))}
            {(!overview || overview.recentRuns.length === 0) && !isLoading && (
              <p className="text-xs text-zinc-500 text-center py-6">No runs recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
