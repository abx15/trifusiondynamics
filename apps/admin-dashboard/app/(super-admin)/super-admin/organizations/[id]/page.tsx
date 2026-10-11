"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  UserCheck,
  Briefcase,
  FolderKanban,
  LifeBuoy,
  Receipt,
  Target,
  ArrowLeft,
  Loader2,
  Power,
  PowerOff,
  AlertTriangle,
  Workflow,
  Activity,
  Shield,
  Mail,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface OrgUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  createdAt: string;
}

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  counts: {
    users: number;
    clients: number;
    projects: number;
    tickets: number;
    invoices: number;
    leads: number;
    employees: number;
  };
  users: OrgUser[];
  stats: {
    tickets: { status: string; _count: { id: number } }[];
    projects: { status: string; _count: { id: number } }[];
    invoices: { status: string; _count: { id: number } }[];
  };
}

interface OrgAutomation {
  organization: { id: string; name: string; slug: string; isActive: boolean };
  totalWorkflows: number;
  activeWorkflows: number;
  totalRuns: number;
  runsByStatus: { status: string; count: number }[];
  workflows: {
    id: string;
    name: string;
    triggerType: string;
    isActive: boolean;
    createdAt: string;
  }[];
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [automation, setAutomation] = useState<OrgAutomation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveConfirmName, setArchiveConfirmName] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [detailsRes, autoRes] = await Promise.all([
        apiClient.get(`/super-admin/organizations/${orgId}`),
        apiClient.get(`/super-admin/organizations/${orgId}/automation`),
      ]);
      setOrg(detailsRes.data);
      setAutomation(autoRes.data);
    } catch (err: any) {
      console.error("Failed to load organization details:", err);
      toast.error(err?.response?.data?.message || "Failed to load organization details");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReactivate = async () => {
    if (!org) return;
    setIsToggling(true);
    try {
      await apiClient.patch(`/super-admin/organizations/${org.id}/reactivate`);
      toast.success(`Organization "${org.name}" reactivated`);
      fetchData();
    } catch (err: any) {
      console.error("Reactivate error:", err);
      toast.error(err?.response?.data?.message || "Failed to reactivate organization");
    } finally {
      setIsToggling(false);
    }
  };

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || archiveConfirmName !== org.name) {
      toast.error("Please type the organization name exactly to confirm");
      return;
    }
    setIsArchiving(true);
    try {
      await apiClient.patch(`/users/organizations/${org.id}/archive`, {
        confirmation: { name: org.name },
      });
      toast.success(`Organization "${org.name}" archived`);
      setShowArchiveConfirm(false);
      setArchiveConfirmName("");
      fetchData();
    } catch (err: any) {
      console.error("Archive error:", err);
      toast.error(err?.response?.data?.message || "Failed to archive organization");
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-zinc-300 text-sm font-semibold">Organization not found</p>
        <button
          onClick={() => router.push("/super-admin/organizations")}
          className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
        >
          &larr; Back to Organizations
        </button>
      </div>
    );
  }

  const countCards = [
    { label: "Employees", value: org.counts.employees, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Users / Members", value: org.counts.users, icon: Users, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Clients", value: org.counts.clients, icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Projects", value: org.counts.projects, icon: FolderKanban, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Tickets", value: org.counts.tickets, icon: LifeBuoy, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
    { label: "Invoices", value: org.counts.invoices, icon: Receipt, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
    { label: "Leads", value: org.counts.leads, icon: Target, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  ];

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <button
            onClick={() => router.push("/super-admin/organizations")}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Organizations
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">{org.name}</h1>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${org.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/10 text-zinc-400 border-zinc-700"}`}>
                  <Activity className="w-3 h-3" /> {org.isActive ? "Active" : "Archived"}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400">/{org.slug}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {org.isActive ? (
            <button
              onClick={() => setShowArchiveConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all cursor-pointer"
            >
              <PowerOff className="w-4 h-4" /> Deactivate Organization
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              disabled={isToggling}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              Reactivate Organization
            </button>
          )}
        </div>
      </div>

      {/* Count Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {countCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className={`h-8 w-8 rounded-xl border flex items-center justify-center ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-white">{card.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-purple-400" /> Operational Breakdown
          </h2>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tickets by Status</p>
            {org.stats.tickets.length === 0 && <p className="text-xs text-zinc-500">No tickets.</p>}
            {org.stats.tickets.map((t) => (
              <div key={t.status} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{t.status.replace(/_/g, " ")}</span>
                <span className="font-bold text-white">{t._count.id}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Projects by Status</p>
            {org.stats.projects.length === 0 && <p className="text-xs text-zinc-500">No projects.</p>}
            {org.stats.projects.map((p) => (
              <div key={p.status} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{p.status.replace(/_/g, " ")}</span>
                <span className="font-bold text-white">{p._count.id}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Invoices by Status</p>
            {org.stats.invoices.length === 0 && <p className="text-xs text-zinc-500">No invoices.</p>}
            {org.stats.invoices.map((i) => (
              <div key={i.status} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{i.status.replace(/_/g, " ")}</span>
                <span className="font-bold text-white">{i._count.id}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employees / Users */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            Employees &amp; Active Users
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {org.counts.employees} employees
            </span>
          </h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {org.users.map((u) => (
              <div key={u.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {u.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {u.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {u.roles.map((role) => (
                    <span key={role} className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      <Shield className="w-2.5 h-2.5 text-amber-400" /> {role}
                    </span>
                  ))}
                  <span className="text-[10px] text-zinc-600 ml-auto">
                    joined {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {org.users.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-6">No active users in this organization.</p>
            )}
          </div>
        </div>

        {/* Automation */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-violet-400" /> Automation
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1">
              <p className="text-xl font-bold text-white">{automation?.totalWorkflows ?? 0}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Workflows</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1">
              <p className="text-xl font-bold text-emerald-400">{automation?.activeWorkflows ?? 0}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Active</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1">
              <p className="text-xl font-bold text-blue-400">{automation?.totalRuns ?? 0}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Runs</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Run Outcomes</p>
            {(automation?.runsByStatus ?? []).length === 0 && (
              <p className="text-xs text-zinc-500">No automation runs yet.</p>
            )}
            {automation?.runsByStatus.map((r) => (
              <div key={r.status} className="flex items-center justify-between text-xs">
                <span className={`font-bold ${r.status === "SUCCESS" ? "text-emerald-400" : r.status === "FAILED" ? "text-red-400" : "text-blue-400"}`}>
                  {r.status}
                </span>
                <span className="font-bold text-white">{r.count}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Workflows</p>
            {(automation?.workflows ?? []).slice(0, 8).map((wf) => (
              <div key={wf.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{wf.name}</p>
                  <p className="text-[10px] text-zinc-500">{wf.triggerType} trigger</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${wf.isActive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-zinc-500 bg-zinc-500/10 border-zinc-700"}`}>
                  {wf.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {(automation?.workflows ?? []).length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-4">No workflows configured for this organization.</p>
            )}
          </div>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Deactivate Organization
              </h3>
              <button
                onClick={() => {
                  setShowArchiveConfirm(false);
                  setArchiveConfirmName("");
                }}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-zinc-400">
              <p>
                This will <strong className="text-red-400">deactivate</strong> the organization{" "}
                <strong className="text-white">"{org.name}"</strong>.
              </p>
              <p className="text-amber-300">
                All business data is preserved, but all users in this organization will be deactivated
                and their sessions revoked.
              </p>
              <p className="text-amber-300">{org.counts.users} user(s) will be affected.</p>
            </div>
            <form onSubmit={handleArchive} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Type the organization name to confirm
                </label>
                <input
                  type="text"
                  value={archiveConfirmName}
                  onChange={(e) => setArchiveConfirmName(e.target.value)}
                  placeholder={org.name}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-red-500/30 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-400 font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowArchiveConfirm(false);
                    setArchiveConfirmName("");
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isArchiving || archiveConfirmName !== org.name}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-xs text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isArchiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PowerOff className="w-3.5 h-3.5" />}
                  Deactivate Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
