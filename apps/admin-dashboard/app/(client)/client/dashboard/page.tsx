"use client";

import { FolderKanban, Receipt, Ticket as TicketIcon, Clock, CheckCircle2, ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useProjects, type Project } from "@/lib/hooks/useProjects";
import { useInvoices, type Invoice } from "@/lib/hooks/useInvoices";
import { useTickets, type Ticket } from "@/lib/hooks/useTickets";

export default function ClientDashboardPage() {
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 10 });
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ status: "SENT", limit: 10 });
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({ limit: 10 });

  const projects = projectsData?.data || [];
  const invoices = invoicesData?.data || [];
  const tickets = ticketsData?.data || [];

  const activeProjects = projects.filter((p: Project) => p.status === "ACTIVE");
  const openTickets = tickets.filter((t: Ticket) => t.status === "OPEN" || t.status === "ASSIGNED" || t.status === "IN_PROGRESS");
  const pendingInvoices = invoices.filter((i: Invoice) => i.status === "SENT" || i.status === "VIEWED");

  const totalPendingAmount = pendingInvoices.reduce((sum: number, inv: Invoice) => sum + inv.total, 0);
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/20 to-zinc-900 border border-purple-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            Client Portal Workspace
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3">Welcome to your Project Hub</h1>
          <p className="mt-2 text-zinc-300 text-sm max-w-2xl">
            Track real-time milestone progress, view open invoices, download deliverables, and raise priority support tickets.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Active Projects</span>
            <FolderKanban className="w-5 h-5 text-purple-400" />
          </div>
          {projectsLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-3" />
          ) : (
            <>
              <p className="text-3xl font-extrabold text-white mt-3">{activeProjects.length}</p>
              <p className="text-xs text-emerald-400 mt-1">Total projects: {projects.length}</p>
            </>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Open Tickets</span>
            <TicketIcon className="w-5 h-5 text-amber-400" />
          </div>
          {ticketsLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-3" />
          ) : (
            <>
              <p className="text-3xl font-extrabold text-white mt-3">{openTickets.length}</p>
              <p className="text-xs text-zinc-400 mt-1">{tickets.filter((t: Ticket) => t.priority === "HIGH" || t.priority === "URGENT").length} High Priority</p>
            </>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Pending Invoices</span>
            <Receipt className="w-5 h-5 text-blue-400" />
          </div>
          {invoicesLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-3" />
          ) : (
            <>
              <p className="text-3xl font-extrabold text-white mt-3">${totalPendingAmount.toLocaleString()}</p>
              <p className="text-xs text-amber-400 mt-1">{pendingInvoices.length} invoices pending</p>
            </>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Total Tickets</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          {ticketsLoading ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mt-3" />
          ) : (
            <>
              <p className="text-3xl font-extrabold text-white mt-3">{tickets.length}</p>
              <p className="text-xs text-emerald-400 mt-1">{tickets.filter((t: Ticket) => t.status === "RESOLVED").length} Resolved</p>
            </>
          )}
        </div>
      </div>

      {/* Active Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Your Active Projects</h2>
          <Link href="/client/projects" className="text-xs font-semibold text-purple-400 hover:underline flex items-center gap-1">
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projectsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="text-center text-zinc-400 text-sm py-8">No active projects</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeProjects.slice(0, 2).map((project: Project) => {
              const completedMilestones = project.milestones?.filter((m) => m.completed).length || 0;
              const totalMilestones = project.milestones?.length || 1;
              const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

              return (
                <div key={project.id} className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      project.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
                      project.status === "ON_HOLD" ? "bg-amber-500/10 text-amber-400" :
                      "bg-purple-500/10 text-purple-400"
                    }`}>
                      {project.status.replace(/_/g, " ")}
                    </span>
                    {project.dueDate && (
                      <span className="text-xs text-zinc-400">Deadline: {new Date(project.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white">{project.name}</h3>
                  <p className="text-xs text-zinc-400">
                    {project.description || "No description available"}
                  </p>

                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>Milestone Progress</span>
                      <span className="font-semibold text-white">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
