"use client";

import { useState } from "react";
import { Ticket, Filter, ShieldCheck, UserCheck, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface AdminTicket {
  id: string;
  code: string;
  client: string;
  title: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  assignedEngineer: string;
  slaDueDate: string;
}

const ADMIN_TICKETS: AdminTicket[] = [
  {
    id: "at-1",
    code: "TCK-8821",
    client: "Apex Retail Solutions",
    title: "Webhook delivery timeout for invoice events",
    priority: "High",
    status: "In Progress",
    assignedEngineer: "Jane Employee",
    slaDueDate: "Today 18:00",
  },
  {
    id: "at-2",
    code: "TCK-7410",
    client: "Zeta Fintech India",
    title: "Request for additional API keys for staging environment",
    priority: "Medium",
    status: "Resolved",
    assignedEngineer: "Arun Kumar",
    slaDueDate: "Jul 29 12:00",
  },
  {
    id: "at-3",
    code: "TCK-9042",
    client: "Vishwa Ventures",
    title: "PDF Extraction OCR table format alignment issue",
    priority: "Urgent",
    status: "Open",
    assignedEngineer: "Unassigned",
    slaDueDate: "Today 15:00",
  },
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>(ADMIN_TICKETS);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const handleAssignEngineer = (ticketId: string, engineer: string) => {
    setTickets(
      tickets.map((t) => (t.id === ticketId ? { ...t, assignedEngineer: engineer, status: "In Progress" } : t))
    );
  };

  const filteredTickets = statusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Agency Support & SLA Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Global administrative ticket control, engineer assignment, and customer SLA monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white"
          >
            <option value="ALL">All Tickets</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase">
            <span>Total Tickets</span>
            <Ticket className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{tickets.length}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase">
            <span>Urgent Unassigned</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-500 mt-2">
            {tickets.filter((t) => t.status === "Open" && t.priority === "Urgent").length}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase">
            <span>SLA Met Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500 mt-2">99.4%</p>
        </div>
      </div>

      {/* Admin Ticket Table */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold uppercase">
            <tr>
              <th className="p-4">Ticket ID</th>
              <th className="p-4">Client</th>
              <th className="p-4">Title</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Assigned Engineer</th>
              <th className="p-4">Status</th>
              <th className="p-4">SLA Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
            {filteredTickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40">
                <td className="p-4 font-mono font-bold text-purple-600 dark:text-purple-400">{t.code}</td>
                <td className="p-4 font-semibold text-slate-900 dark:text-white">{t.client}</td>
                <td className="p-4 max-w-xs truncate">{t.title}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.priority === "Urgent"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : t.priority === "High"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                    }`}
                  >
                    {t.priority}
                  </span>
                </td>
                <td className="p-4">
                  <select
                    value={t.assignedEngineer}
                    onChange={(e) => handleAssignEngineer(t.id, e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="Jane Employee">Jane Employee</option>
                    <option value="Arun Kumar">Arun Kumar</option>
                    <option value="Senior Tech Lead">Senior Tech Lead</option>
                  </select>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === "Open"
                        ? "bg-amber-500/20 text-amber-500"
                        : t.status === "In Progress"
                        ? "bg-blue-500/20 text-blue-500"
                        : "bg-emerald-500/20 text-emerald-500"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-4 text-xs font-mono text-slate-500 dark:text-zinc-400">{t.slaDueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
