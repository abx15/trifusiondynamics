"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEstimate } from "@/lib/hooks/useEstimates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { LineItemsEditor } from "@/components/shared/LineItemsEditor";

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: estimate, isLoading } = useEstimate(id);

  if (isLoading) {
    return <div className="space-y-4 max-w-4xl mx-auto">{[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}</div>;
  }

  if (!estimate) {
    return <div className="text-center py-20"><p className="text-muted-foreground">Estimate not found.</p><Link href="/billing/estimates" className="text-primary text-sm mt-2 inline-block">← Back</Link></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/billing/estimates" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground font-mono">{estimate.number}</h1>
              <StatusBadge status={estimate.status} size="md" />
            </div>
            <p className="text-sm text-muted-foreground">{estimate.client?.name ?? "No client"}</p>
          </div>
        </div>
        <MoneyDisplay amount={estimate.total} size="xl" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-5">Line Items</h2>
        <LineItemsEditor value={estimate.lineItems ?? []} onChange={() => {}} readOnly />
      </div>
      {estimate.notes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{estimate.notes}</p>
        </div>
      )}
    </div>
  );
}
