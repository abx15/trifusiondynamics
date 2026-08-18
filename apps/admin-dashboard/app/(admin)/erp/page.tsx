"use client";

import * as React from "react";
import Link from "next/link";
import { Users2, Briefcase, CheckSquare, TrendingUp, ArrowRight } from "lucide-react";
import { useClients } from "@/lib/hooks/useClients";
import { useProjects } from "@/lib/hooks/useProjects";
import { useTasks } from "@/lib/hooks/useTasks";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  color,
  sub,
}: {
  label: string;
  value: string | number | React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} shrink-0`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}

export default function ERPPage() {
  const { data: clients } = useClients({ limit: 1 });
  const { data: projects } = useProjects({ limit: 1 });
  const { data: activeProjects } = useProjects({ status: "ACTIVE", limit: 1 });
  const { data: invoices } = useInvoices({ limit: 1 });
  const { data: overdueInvoices } = useInvoices({ status: "OVERDUE", limit: 1 });

  const totalRevenue = invoices?.data.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">ERP Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live snapshot of clients, projects, tasks, and billing
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total Clients"
          value={clients?.total ?? "—"}
          icon={Users2}
          href="/clients"
          color="bg-blue-500"
          sub="Active client accounts"
        />
        <StatCard
          label="Active Projects"
          value={activeProjects?.total ?? "—"}
          icon={Briefcase}
          href="/projects"
          color="bg-indigo-500"
          sub={`${projects?.total ?? "—"} total projects`}
        />
        <StatCard
          label="Invoices"
          value={invoices?.total ?? "—"}
          icon={TrendingUp}
          href="/billing/invoices"
          color="bg-emerald-500"
          sub={overdueInvoices?.total ? `${overdueInvoices.total} overdue` : "All up to date"}
        />
        <StatCard
          label="Revenue Collected"
          value={<MoneyDisplay amount={totalRevenue} size="xl" />}
          icon={CheckSquare}
          href="/finance"
          color="bg-orange-500"
          sub="From paid invoices"
        />
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Add Client", href: "/clients/new", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100" },
            { label: "New Project", href: "/projects/new", color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100" },
            { label: "New Lead", href: "/crm/leads/new", color: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100" },
            { label: "Create Invoice", href: "/billing/invoices/new", color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100" },
          ].map(({ label, href, color }) => (
            <Link key={label} href={href} className={`flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${color}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
