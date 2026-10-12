"use client";

import * as React from "react";
import Link from "next/link";
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  Loader2,
  Users,
  Briefcase,
  Target,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
  MoreVertical,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useTicketSummary, useTickets, type Ticket } from "@/lib/hooks/useTickets";
import { useClients } from "@/lib/hooks/useClients";
import { useProjects } from "@/lib/hooks/useProjects";
import { useEmployees, type Employee } from "@/lib/hooks/useHR";
import { format } from "date-fns";

export default function AgentDashboardPage() {
  const { user } = useAuthStore();
  const { data: summary, isLoading: summaryLoading } = useTicketSummary();
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({ limit: 10 });
  const { data: clientsData, isLoading: clientsLoading } = useClients({ limit: 5 });
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 5 });
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ status: "ACTIVE" });

  const tickets = ticketsData?.data || [];
  const clients = clientsData?.data || [];
  const projects = projectsData?.data || [];
  const employees = employeesData || [];

  const activeEmployees = employees.filter(e => e.status === "ACTIVE").length;

  const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    OPEN: { bg: "bg-blue-500/20", text: "text-blue-400", icon: <AlertCircle className="w-3 h-3" /> },
    IN_PROGRESS: { bg: "bg-amber-500/20", text: "text-amber-400", icon: <Zap className="w-3 h-3" /> },
    PENDING_CLIENT: { bg: "bg-purple-500/20", text: "text-purple-400", icon: <Eye className="w-3 h-3" /> },
    RESOLVED: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
    CLOSED: { bg: "bg-zinc-500/20", text: "text-zinc-400", icon: <XCircle className="w-3 h-3" /> },
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-zinc-500/20 text-zinc-400",
    MEDIUM: "bg-blue-500/20 text-blue-400",
    HIGH: "bg-amber-500/20 text-amber-400",
    URGENT: "bg-red-500/20 text-red-400",
    CRITICAL: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
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
              Organization: <span className="font-medium text-white">{user?.organization?.name || "TFX AI Demo Org"}</span> · Org-wide Overview
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

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Total Tickets"
          value={summary?.total || 0}
          icon={<TicketIcon className="w-5 h-5 text-blue-400" />}
        />
        <MetricCard
          label="Open Tickets"
          value={(summary?.open || 0) + (summary?.inProgress || 0)}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          variant="warning"
        />
        <MetricCard
          label="Resolved This Week"
          value={summary?.resolved || 0}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          variant="success"
        />
        <MetricCard
          label="Active Projects"
          value={projects.filter(p => p.status === "ACTIVE").length}
          icon={<Briefcase className="w-5 h-5 text-purple-400" />}
        />
        <MetricCard
          label="Total Clients"
          value={clients.length}
          icon={<Target className="w-5 h-5 text-orange-400" />}
        />
        <MetricCard
          label="Active Team"
          value={activeEmployees}
          icon={<Users className="w-5 h-5 text-cyan-400" />}
          subtext={`${activeEmployees} active members`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Ticket Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Status Breakdown */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TicketIcon className="w-5 h-5" />
              Ticket Status Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { key: "open", label: "Open", count: summary?.open || 0, color: "blue" },
                { key: "inProgress", label: "In Progress", count: summary?.inProgress || 0, color: "amber" },
                { key: "waitingForClient", label: "Pending Client", count: summary?.waitingForClient || 0, color: "purple" },
                { key: "resolved", label: "Resolved", count: summary?.resolved || 0, color: "emerald" },
                { key: "slaBreached", label: "SLA Breached", count: summary?.slaBreached || 0, color: "red" },
              ].map((stat) => (
                <div key={stat.key} className={`p-4 rounded-xl border ${stat.color === "red" ? "border-red-500/30 bg-red-500/10" : "border-zinc-800"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityColors[stat.key.toUpperCase()] || `bg-${stat.color}-500/20 text-${stat.color}-400`}`}>
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-white">{stat.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tickets Table */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TicketIcon className="w-5 h-5" />
                Recent Tickets (Org-wide)
              </h2>
              <Link
                href="/agent/tickets"
                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                View All
              </Link>
            </div>
            {ticketsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 animate-pulse">
                    <div className="h-4 w-1/4 bg-zinc-800 rounded"></div>
                    <div className="h-3 w-3/4 bg-zinc-800 rounded mt-2"></div>
                    <div className="h-3 w-1/2 bg-zinc-800 rounded mt-2"></div>
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center text-zinc-400 text-sm py-8">No tickets found</div>
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 8).map((ticket: Ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-400">{ticket.ticketNumber}</span>
                          <span className={`${priorityColors[ticket.priority] || "bg-zinc-500/20 text-zinc-400"} px-2 py-0.5 rounded text-xs font-semibold`}>
                            {ticket.priority}
                          </span>
                          <span className={`${statusColors[ticket.status]?.bg || "bg-zinc-500/20"} ${statusColors[ticket.status]?.text || "text-zinc-400"} px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1`}>
                            {statusColors[ticket.status]?.icon}
                            {ticket.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-1 truncate">{ticket.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                          <span>Client: <span className="text-zinc-300">{ticket.clientName || "N/A"}</span></span>
                          <span>Assignee: <span className="text-zinc-300">{ticket.assignedAgentName || "Unassigned"}</span></span>
                          <span>Project: <span className="text-zinc-300">{ticket.projectName || "N/A"}</span></span>
                          <span className="font-mono">{format(new Date(ticket.createdAt), "MMM d, HH:mm")}</span>
                        </div>
                      </div>
                      <Link
                        href={`/agent/tickets/${ticket.id}`}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors shrink-0"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Projects & Clients */}
        <div className="space-y-6">
          {/* Active Projects */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Active Projects
              </h2>
              <Link href="/projects" className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                View All
              </Link>
            </div>
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 animate-pulse">
                    <div className="h-4 w-1/3 bg-zinc-800 rounded"></div>
                    <div className="h-3 w-1/2 bg-zinc-800 rounded mt-2"></div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center text-zinc-400 text-sm py-6">No projects</div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: any) => (
                  <div key={project.id} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white truncate">{project.name}</p>
                        <p className="text-xs text-zinc-400">{project.clientName}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        project.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" :
                        project.status === "ON_HOLD" ? "bg-amber-500/20 text-amber-400" :
                        "bg-zinc-500/20 text-zinc-400"
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                      <span>{project.progress || 0}% complete</span>
                      <span>•</span>
                      <span>{project.taskCount || 0} tasks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Clients */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5" />
                Top Clients
              </h2>
              <Link href="/clients" className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                View All
              </Link>
            </div>
            {clientsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 animate-pulse">
                    <div className="h-4 w-1/3 bg-zinc-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center text-zinc-400 text-sm py-6">No clients</div>
            ) : (
              <div className="space-y-3">
                {clients.slice(0, 5).map((client: any) => (
                  <div key={client.id} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-400">
                            {client.name?.charAt(0).toUpperCase() || "C"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{client.name}</p>
                          <p className="text-xs text-zinc-400">{client.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        client.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"
                      }`}>
                        {client.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Status */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Status
              </h2>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${activeEmployees > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                {activeEmployees} Active
              </span>
            </div>
            {employeesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-2 rounded bg-zinc-950/60 border border-zinc-800 animate-pulse">
                    <div className="h-4 w-1/4 bg-zinc-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center text-zinc-400 text-sm py-4">No team members</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees.slice(0, 8).map((emp: Employee) => {
                  const isActive = emp.status === "ACTIVE";
                  return (
                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900/60 transition-colors">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {emp.user?.name?.charAt(0).toUpperCase() || emp.employeeCode?.charAt(0).toUpperCase() || "U"}
                          </span>
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${isActive ? "bg-emerald-500" : "bg-zinc-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{emp.user?.name || emp.employeeCode}</p>
                        <p className="text-xs text-zinc-400">{emp.user?.email || emp.department}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                        {emp.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  variant,
  trend,
  subtext,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning";
  trend?: { value: number; label: string };
  subtext?: string;
}) {
  const bgColor = variant === "success" ? "bg-emerald-500/10 border-emerald-500/20" :
                  variant === "warning" ? "bg-amber-500/10 border-amber-500/20" :
                  "bg-zinc-900/60 border-zinc-800";

  return (
    <div className={`p-5 rounded-2xl border ${bgColor}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
          <p className="text-3xl font-black text-white mt-1">{value}</p>
          {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
      </div>
    </div>
  );
}