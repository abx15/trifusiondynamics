"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useEstimates } from "@/lib/hooks/useEstimates";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useRouter } from "next/navigation";

export default function EstimatesPage() {
  const router = useRouter();
  const { data, isLoading } = useEstimates({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Estimates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} total estimates</p>
        </div>
        <Link href="/billing/estimates/new" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          New Estimate
        </Link>
      </div>

      <DataTable
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(e) => router.push(`/billing/estimates/${e.id}`)}
        columns={[
          { key: "number", header: "Estimate #", render: (e) => <span className="font-mono text-xs font-semibold">{e.number}</span> },
          { key: "client", header: "Client", render: (e) => e.client?.name ?? "—" },
          { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
          { key: "total", header: "Total", render: (e) => <MoneyDisplay amount={e.total} /> },
          { key: "createdAt", header: "Created", render: (e) => new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
        ]}
        emptyMessage="No estimates found."
      />
    </div>
  );
}
