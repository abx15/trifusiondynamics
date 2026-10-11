"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTicketSummary } from "@/lib/hooks/useTickets";
import { useProjects } from "@/lib/hooks/useProjects";
import { apiClient } from "@/lib/api-client";
import {
  Users,
  Shield,
  Cpu,
  Activity as ActivityIcon,
  Clock,
  Terminal,
  Loader2,
  Building2,
  UserCheck,
  Briefcase,
  FolderKanban,
  LifeBuoy,
  Receipt,
  Target,
  RefreshCw,
} from "lucide-react";

interface OrgDashboard {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  counts: {
    users: number;
    clients: number;
    projects: number;
    tickets: number;
    invoices: number;
    leads: number;
    employees: number;
  };
  stats: {
    tickets: { status: string; _count: { id: number } }[];
    projects: { status: string; _count: { id: number } }[];
    invoices: { status: string; _count: { id: number } }[];
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: ticketSummary, isLoading: ticketsLoading } = useTicketSummary();
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 1 });
  const [orgDash, setOrgDash] = React.useState<OrgDashboard | null>(null);
  const [orgLoading, setOrgLoading] = React.useState(true);

  const orgName = user?.organization?.name || user?.organizationId || "Organization";

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/users/org-dashboard");
        if (!cancelled) setOrgDash(res.data);
      } catch (err) {
        console.error("Failed to load organization dashboard stats:", err);
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalProjects = projectsData?.total || 0;

  const orgCards = [
    {
      label: "Employees Working",
      value: orgLoading ? "…" : (orgDash?.counts.employees ?? 0).toString(),
      description: "Active workforce in your organization",
      icon: UserCheck,
    },
    {
      label: "Team Members",
      value: orgLoading ? "…" : (orgDash?.counts.users ?? 0).toString(),
      description: "Users with login access",
      icon: Users,
    },
    {
      label: "Clients",
      value: orgLoading ? "…" : (orgDash?.counts.clients ?? 0).toString(),
      description: "Client accounts",
      icon: Briefcase,
    },
    {
      label: "Projects",
      value: projectsLoading ? "…" : totalProjects.toString(),
      description: "Manage in Projects section",
      icon: FolderKanban,
    },
    {
      label: "Tickets",
      value: orgLoading ? "…" : (orgDash?.counts.tickets ?? 0).toString(),
      description: `${ticketSummary?.open || 0} open, ${ticketSummary?.resolved || 0} resolved`,
      icon: LifeBuoy,
    },
    {
      label: "Invoices",
      value: orgLoading ? "…" : (orgDash?.counts.invoices ?? 0).toString(),
      description: "Billing documents",
      icon: Receipt,
    },
    {
      label: "Leads",
      value: orgLoading ? "…" : (orgDash?.counts.leads ?? 0).toString(),
      description: "Pipeline leads",
      icon: Target,
    },
    {
      label: "Security Roles",
      value: user?.roles?.length?.toString() || "0",
      description: "RBAC policies active",
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & PageHeader */}
      <PageHeader
        title={`${orgName} — Operations Overview`}
        breadcrumbs={[]}
        actionSlot={
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white dark:bg-zinc-900 border border-border rounded-lg px-3 py-1.5 font-medium shadow-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Updated: Just Now</span>
          </div>
        }
      />

      {/* Organization Banner */}
      <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Welcome back, {user?.name || "Administrator"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Workspace tenant:{" "}
                <span className="font-mono text-xs font-semibold text-primary">
                  {orgName}
                </span>{" "}
                ({user?.organizationId || "org_default"}). Your roles:{" "}
                <span className="font-semibold text-foreground text-xs">
                  {user?.roles?.join(", ") || "admin"}
                </span>
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              orgDash?.isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-zinc-500/10 text-zinc-500 border-zinc-500/30"
            }`}
          >
            <ActivityIcon className="h-3 w-3" />
            {orgDash?.isActive ? "Organization Active" : "Organization Archived"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          This dashboard shows only <strong>{orgName}</strong>&apos;s data — employees, clients, projects,
          tickets and invoices are isolated per organization. Super Admin sees every organization from the
          Super Admin Portal.
        </p>
      </div>

      {/* Org Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {orgCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ticket & Project Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Tickets by Status</CardTitle>
            </div>
            <CardDescription>Your organization&apos;s ticket pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : !orgDash?.stats.tickets.length ? (
              <p className="text-xs text-muted-foreground">No tickets yet.</p>
            ) : (
              orgDash.stats.tickets.map((t) => (
                <div key={t.status} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.status.replace(/_/g, " ")}</span>
                  <span className="font-bold text-foreground">{t._count.id}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Projects by Status</CardTitle>
            </div>
            <CardDescription>Delivery pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : !orgDash?.stats.projects.length ? (
              <p className="text-xs text-muted-foreground">No projects yet.</p>
            ) : (
              orgDash.stats.projects.map((p) => (
                <div key={p.status} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{p.status.replace(/_/g, " ")}</span>
                  <span className="font-bold text-foreground">{p._count.id}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Invoices by Status</CardTitle>
            </div>
            <CardDescription>Billing pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : !orgDash?.stats.invoices.length ? (
              <p className="text-xs text-muted-foreground">No invoices yet.</p>
            ) : (
              orgDash.stats.invoices.map((i) => (
                <div key={i.status} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{i.status.replace(/_/g, " ")}</span>
                  <span className="font-bold text-foreground">{i._count.id}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Console Activity Placeholder */}
      <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-4.5 w-4.5 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Security Activity Logs</CardTitle>
          </div>
          <CardDescription>
            Recent authentication activities and permission audits for your tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden bg-slate-50 dark:bg-zinc-950 p-4 font-mono text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <p className="text-emerald-600 dark:text-emerald-500">
              [2026-07-12T14:55:01Z] SUCCESS: Session token rotated successfully for {user?.email}
            </p>
            <p>
              [2026-07-12T14:54:33Z] AUDIT: Permission &apos;hr:read&apos; evaluated to TRUE
            </p>
            <p>
              [2026-07-12T14:50:11Z] INFO: Initialized secure Zustand in-memory store
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
