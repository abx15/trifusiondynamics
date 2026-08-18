"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useRouter } from "next/navigation";

export default function InvoicesPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState("");
  const { data, isLoading } = useInvoices({ status: status || undefined, limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total invoices</p>
        </div>
        <Link href="/billing/invoices/new" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      <div className="flex gap-2">
        {["", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              status === s
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <DataTable
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(inv) => router.push(`/billing/invoices/${inv.id}`)}
        columns={[
          { key: "number", header: "Invoice #", render: (inv) => <span className="font-mono text-xs font-semibold">{inv.number}</span> },
          { key: "client", header: "Client", render: (inv) => inv.client?.name ?? "—" },
          { key: "status", header: "Status", render: (inv) => <StatusBadge status={inv.status} /> },
          { key: "total", header: "Total", render: (inv) => <MoneyDisplay amount={inv.total} /> },
          { key: "issueDate", header: "Issued", render: (inv) => new Date(inv.issueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
          { key: "dueDate", header: "Due", render: (inv) => new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) },
        ]}
        emptyMessage="No invoices found."
      />
    </div>
  );
}
