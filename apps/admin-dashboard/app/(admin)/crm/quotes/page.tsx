"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useQuotes } from "@/lib/hooks/useQuotes";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useRouter } from "next/navigation";

export default function QuotesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const { data, isLoading } = useQuotes({ limit: 50 });

  const filtered = (data?.data ?? []).filter((q) =>
    !search ||
    q.number.toLowerCase().includes(search.toLowerCase()) ||
    q.client?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total quotes</p>
        </div>
        <Link
          href="/crm/quotes/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Quote
        </Link>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Search quotes..."
        />
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        onRowClick={(q) => router.push(`/crm/quotes/${q.id}`)}
        columns={[
          { key: "number", header: "Quote #", render: (q) => <span className="font-mono text-xs font-semibold">{q.number}</span> },
          { key: "client", header: "Client", render: (q) => q.client?.name ?? q.lead?.name ?? "—" },
          { key: "status", header: "Status", render: (q) => <StatusBadge status={q.status} /> },
          { key: "total", header: "Total", render: (q) => <MoneyDisplay amount={q.total} /> },
          {
            key: "createdAt",
            header: "Created",
            render: (q) =>
              new Date(q.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          },
          {
            key: "validUntil",
            header: "Valid Until",
            render: (q) =>
              q.validUntil
                ? new Date(q.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                : "—",
          },
        ]}
        emptyMessage="No quotes found. Create your first quote."
      />
    </div>
  );
}
