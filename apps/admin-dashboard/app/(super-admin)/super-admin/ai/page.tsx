"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BrainCircuit,
  FileText,
  Search,
  Mail,
  CalendarClock,
  Loader2,
  RefreshCw,
  Sparkles,
  Globe,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface AiOverview {
  totalProposals: number;
  totalAudits: number;
  totalEmails: number;
  totalSummaries: number;
  proposalsByOrg: { organizationId: string; _count: { id: number } }[];
  auditsByOrg: { organizationId: string; _count: { id: number } }[];
  recentProposals: {
    id: string;
    leadId: string | null;
    clientId: string | null;
    requirements: string;
    status: string;
    createdById: string;
    organizationId: string;
    createdAt: string;
  }[];
  recentAudits: {
    id: string;
    websiteUrl: string;
    score: number | null;
    organizationId: string;
    createdAt: string;
  }[];
}

interface Org {
  id: string;
  name: string;
  slug: string;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-zinc-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function SuperAdminAiPage() {
  const [overview, setOverview] = useState<AiOverview | null>(null);
  const [orgMap, setOrgMap] = useState<Map<string, Org>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [aiRes, orgsRes] = await Promise.all([
        apiClient.get("/super-admin/ai/overview"),
        apiClient.get("/users/organizations"),
      ]);
      setOverview(aiRes.data);
      const orgsData = Array.isArray(orgsRes.data) ? orgsRes.data : (orgsRes.data?.data || []);
      setOrgMap(new Map((orgsData as Org[]).map((o) => [o.id, o])));
    } catch (err: any) {
      console.error("Failed to load AI overview:", err);
      toast.error("Failed to load AI analysis data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const orgName = (id: string) => orgMap.get(id)?.name ?? id;
  const totalAiTasks =
    (overview?.totalProposals ?? 0) +
    (overview?.totalAudits ?? 0) +
    (overview?.totalEmails ?? 0) +
    (overview?.totalSummaries ?? 0);

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2 border border-cyan-500/30">
            <BrainCircuit className="w-3 h-3" /> AI Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AI Analysis &amp; Usage
          </h1>
          <p className="text-xs text-zinc-400">
            Platform-wide AI consumption — proposal generation, SEO audits, email drafts and meeting summaries across every tenant.
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
            <span className="text-xs font-semibold uppercase tracking-wider">Proposal Generator</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalProposals ?? 0}</p>
          <p className="text-[11px] text-zinc-500">AI-generated proposals</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">SEO Audits</span>
            <Search className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalAudits ?? 0}</p>
          <p className="text-[11px] text-zinc-500">Website audits analyzed</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Email Drafts</span>
            <Mail className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalEmails ?? 0}</p>
          <p className="text-[11px] text-zinc-500">AI-drafted emails</p>
        </div>
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Meeting Summaries</span>
            <CalendarClock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.totalSummaries ?? 0}</p>
          <p className="text-[11px] text-zinc-500">Transcripts summarized</p>
        </div>
      </div>

      {/* Total banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-zinc-950 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Total AI Tasks Executed</p>
            <p className="text-xl font-bold text-white">{totalAiTasks}</p>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 max-w-sm">
          AI features are consumed per tenant organization. Track which organizations drive the most AI usage below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage by Organization */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" /> AI Usage by Organization
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> Proposals by Organization
                </p>
                {(overview?.proposalsByOrg ?? []).length === 0 && (
                  <p className="text-xs text-zinc-500">No proposal activity yet.</p>
                )}
                {overview?.proposalsByOrg.map((row, i) => {
                  const max = overview.proposalsByOrg[0]?._count.id ?? 1;
                  return (
                    <div key={row.organizationId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium truncate mr-2">{orgName(row.organizationId)}</span>
                        <span className="text-amber-400 font-bold">{row._count.id}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${Math.max(4, (row._count.id / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-400" /> SEO Audits by Organization
                </p>
                {(overview?.auditsByOrg ?? []).length === 0 && (
                  <p className="text-xs text-zinc-500">No SEO audit activity yet.</p>
                )}
                {overview?.auditsByOrg.map((row) => {
                  const max = overview.auditsByOrg[0]?._count.id ?? 1;
                  return (
                    <div key={row.organizationId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium truncate mr-2">{orgName(row.organizationId)}</span>
                        <span className="text-blue-400 font-bold">{row._count.id}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.max(4, (row._count.id / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" /> Recent SEO Audits
          </h2>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {overview?.recentAudits.map((audit) => (
              <div key={audit.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate font-mono">{audit.websiteUrl}</span>
                  <span className={`text-sm font-bold ${scoreColor(audit.score)}`}>
                    {audit.score !== null ? `${audit.score}/100` : "—"}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  {orgName(audit.organizationId)} · {new Date(audit.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {(!overview || overview.recentAudits.length === 0) && !isLoading && (
              <p className="text-xs text-zinc-500 text-center py-6">No SEO audits recorded yet.</p>
            )}
          </div>

          <h2 className="text-lg font-bold text-white flex items-center gap-2 pt-2">
            <FileText className="w-5 h-5 text-amber-400" /> Recent Proposals
          </h2>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {overview?.recentProposals.map((proposal) => (
              <div key={proposal.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {proposal.requirements.slice(0, 80)}{proposal.requirements.length > 80 ? "…" : ""}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {proposal.status}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  {orgName(proposal.organizationId)} · {new Date(proposal.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {(!overview || overview.recentProposals.length === 0) && !isLoading && (
              <p className="text-xs text-zinc-500 text-center py-6">No proposals generated yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
