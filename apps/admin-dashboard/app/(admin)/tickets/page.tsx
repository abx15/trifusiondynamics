"use client";

import { useState, useEffect } from "react";
import { Ticket as TicketIcon, Filter, ShieldCheck, UserCheck, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { useTickets, useAssignTicket, type Ticket } from "@/lib/hooks/useTickets";
import { useEmployees as useEmployeesHook, type Employee } from "@/lib/hooks/useHR";
import { useWebSocket } from "@/lib/websocket";

export default function AdminTicketsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { data: ticketsData, isLoading, error } = useTickets({ limit: 50 });
  const { data: employees } = useEmployeesHook({ status: "ACTIVE" });
  const assignTicket = useAssignTicket();
  const { isConnected, lastMessage, subscribeToTicket } = useWebSocket("");

  const tickets = ticketsData?.data || [];

  // Subscribe to ticket updates when tickets are loaded
  useEffect(() => {
    if (isConnected && tickets.length > 0) {
      tickets.forEach((ticket) => {
        subscribeToTicket(ticket.id);
      });
    }
  }, [isConnected, tickets, subscribeToTicket]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === "ticket.updated" || lastMessage?.type === "ticket.assigned") {
      // React Query will auto-refetch via query invalidation in the mutation
      console.log("Ticket update received via WebSocket:", lastMessage);
    }
  }, [lastMessage]);

  const handleAssignEngineer = async (ticketId: string, employeeId: string) => {
    try {
      await assignTicket.mutateAsync({ id: ticketId, employeeId, type: "PRIMARY" });
    } catch (error) {
      console.error("Failed to assign ticket:", error);
    }
  };

  const filteredTickets = statusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === statusFilter);

  const formatSLADate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return "Overdue";
    if (diffHours < 24) return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-amber-500/20 text-amber-500";
      case "ASSIGNED":
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-500";
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-500/20 text-emerald-500";
      case "WAITING_FOR_CLIENT":
      case "WAITING_FOR_EMPLOYEE":
        return "bg-purple-500/20 text-purple-500";
      default:
        return "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
      case "URGENT":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
      case "HIGH":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      default:
        return "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-zinc-400">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-zinc-400">Failed to load tickets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TicketIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Agency Support & SLA Management
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
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase">
            <span>Total Tickets</span>
            <TicketIcon className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{tickets.length}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase">
            <span>Urgent Unassigned</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-500 mt-2">
            {tickets.filter((t: Ticket) => !t.assignedAgentId && (t.priority === "URGENT" || t.priority === "CRITICAL")).length}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase">
            <span>Real-time Updates</span>
            <CheckCircle2 className={`w-4 h-4 ${isConnected ? "text-emerald-500" : "text-slate-400"}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${isConnected ? "text-emerald-500" : "text-slate-400"}`}>
            {isConnected ? "Connected" : "Offline"}
          </p>
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
            {filteredTickets.map((t: Ticket) => (
              <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40">
                <td className="p-4 font-mono font-bold text-purple-600 dark:text-purple-400">{t.ticketNumber}</td>
                <td className="p-4 font-semibold text-slate-900 dark:text-white">{t.clientName || "N/A"}</td>
                <td className="p-4 max-w-xs truncate">{t.title}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(t.priority)}`}
                  >
                    {t.priority}
                  </span>
                </td>
                <td className="p-4">
                  <select
                    value={t.assignedAgentId || ""}
                    onChange={(e) => e.target.value && handleAssignEngineer(t.id, e.target.value)}
                    disabled={assignTicket.isPending}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {employees?.map((emp: Employee) => (
                      <option key={emp.id} value={emp.userId}>
                        {emp.user?.name || emp.employeeCode}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(t.status)}`}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-4 text-xs font-mono text-slate-500 dark:text-zinc-400">{formatSLADate(t.resolutionDeadline)}</td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-zinc-400">
                  No tickets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
