"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Users, Shield, Cpu, Activity, Clock, Terminal } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      label: "Active Team Members",
      value: "12 Members",
      description: "Manage in Organization Settings",
      icon: Users,
    },
    {
      label: "Configured Security Roles",
      value: "4 Roles",
      description: "RBAC policies active",
      icon: Shield,
    },
    {
      label: "Active AI Pipelines",
      value: "8 Active",
      description: "RAG & Document processing stubs",
      icon: Cpu,
    },
    {
      label: "System Status",
      value: "Operational",
      description: "API latencies normal (85ms)",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome & PageHeader */}
      <PageHeader
        title="Operations Overview"
        breadcrumbs={[]}
        actionSlot={
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white dark:bg-zinc-900 border border-border rounded-lg px-3 py-1.5 font-medium shadow-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Updated: Just Now</span>
          </div>
        }
      />

      {/* Greeting Banner */}
      <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Welcome back, {user?.name || "Administrator"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Workspace tenant: <span className="font-mono text-xs font-semibold text-primary">{user?.organizationId || "org_default"}</span>. 
          Your roles: <span className="font-semibold text-foreground text-xs">{user?.roles?.join(", ") || "admin"}</span>.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
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
