"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, MapPin, Hash } from "lucide-react";
import { useClient } from "@/lib/hooks/useClients";
import { useProjects } from "@/lib/hooks/useProjects";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DataTable } from "@/components/shared/DataTable";
import { useRouter } from "next/navigation";

type Tab = "overview" | "projects" | "invoices";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("overview");
  const { data: client, isLoading } = useClient(id);
  const { data: projects } = useProjects({ clientId: id, limit: 50 });
  const { data: invoices } = useInvoices({ clientId: id, limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Client not found.</p>
        <Link href="/clients" className="text-primary text-sm mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/clients" className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
          {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "projects", "invoices"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {t === "projects" && projects?.total !== undefined && (
              <span className="ml-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-muted-foreground rounded-full px-1.5 py-0.5">
                {projects.total}
              </span>
            )}
            {t === "invoices" && invoices?.total !== undefined && (
              <span className="ml-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-muted-foreground rounded-full px-1.5 py-0.5">
                {invoices.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Mail, label: "Email", value: client.email },
            { icon: Phone, label: "Phone", value: client.phone },
            { icon: Building2, label: "Company", value: client.company },
            { icon: Hash, label: "GST Number", value: client.gstNumber },
            { icon: MapPin, label: "City", value: client.city },
            { icon: MapPin, label: "Country", value: client.country },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
            </div>
          ))}
          {client.address && (
            <div className="col-span-2 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Address</p>
              <p className="text-sm text-foreground">{client.address}</p>
            </div>
          )}
          {client.notes && (
            <div className="col-span-2 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Projects */}
      {tab === "projects" && (
        <DataTable
          data={projects?.data ?? []}
          onRowClick={(p) => router.push(`/projects/${p.id}`)}
          columns={[
            { key: "name", header: "Project", render: (p) => <span className="font-medium">{p.name}</span> },
            { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
            { key: "priority", header: "Priority", render: (p) => <StatusBadge status={p.priority} /> },
            { key: "dueDate", header: "Due", render: (p) => p.dueDate ? new Date(p.dueDate).toLocaleDateString("en-IN") : "—" },
          ]}
          emptyMessage="No projects for this client."
        />
      )}

      {/* Invoices */}
      {tab === "invoices" && (
        <DataTable
          data={invoices?.data ?? []}
          onRowClick={(inv) => router.push(`/billing/invoices/${inv.id}`)}
          columns={[
            { key: "number", header: "Invoice #", render: (inv) => <span className="font-mono text-xs font-semibold">{inv.number}</span> },
            { key: "status", header: "Status", render: (inv) => <StatusBadge status={inv.status} /> },
            { key: "total", header: "Total", render: (inv) => <MoneyDisplay amount={inv.total} /> },
            { key: "dueDate", header: "Due", render: (inv) => new Date(inv.dueDate).toLocaleDateString("en-IN") },
          ]}
          emptyMessage="No invoices for this client."
        />
      )}
    </div>
  );
}
