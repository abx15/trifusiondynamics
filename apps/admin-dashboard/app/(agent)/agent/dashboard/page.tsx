"use client";

import * as React from "react";
import Link from "next/link";
import { Ticket as TicketIcon, Clock, CheckCircle2, AlertTriangle, ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTicketSummary, useTickets, type Ticket } from "@/lib/hooks/useTickets";

export default function AgentDashboardPage() {
  const { user } = useAuthStore();
  const { data: summary, isLoading: summaryLoading } = useTicketSummary();
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({ assignedToMe: true, limit: 5 });

  const tickets = ticketsData?.data || [];
  const recentTickets = tickets.slice(0, 2);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 to-purple-900/30 border border-blue-500/20 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold uppercase tracking-wider">
              Agent Portal Active
            </span>
            <h1 className="text-2xl font-bold text-white mt-3">
              Welcome back, {user?.name || "Agent"}!
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              URL Path: <span className="font-mono text-blue-400">/agent/dashboard</span> · Assigned Support Queue & Ticket Management
            </p>
          </div>
          <Link
            href="/agent/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-lg shadow-blue-600/30"
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Assigned Tickets</span>
            <TicketIcon className="w-4 h-4 text-blue-400" />
          </div>
          {summaryLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-black text-white mt-2">{summary?.assigned || 0}</p>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Pending Action</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          {summaryLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-black text-amber-400 mt-2">{(summary?.open || 0) + (summary?.inProgress || 0)}</p>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          {summaryLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-black text-emerald-400 mt-2">{summary?.resolved || 0}</p>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>SLA Breached</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          {summaryLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-2" />
          ) : (
            <p className="text-3xl font-black text-purple-400 mt-2">{summary?.slaBreached || 0}</p>
          )}
        </div>
      </div>

      {/* Quick Action Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <h2 className="text-lg font-bold text-white">Recent Ticket Queue</h2>
        {ticketsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ) : recentTickets.length === 0 ? (
          <div className="text-center text-zinc-400 text-sm py-8">No assigned tickets</div>
        ) : (
          <div className="space-y-3">
            {recentTickets.map((ticket: Ticket) => (
              <div key={ticket.id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-400">{ticket.ticketNumber}</span>
                  <p className="text-sm font-semibold text-white">{ticket.title}</p>
                  <p className="text-xs text-zinc-400">Client: {ticket.clientName || "N/A"} · Priority: {ticket.priority}</p>
                </div>
                <Link
                  href="/agent/tickets"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Respond
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
