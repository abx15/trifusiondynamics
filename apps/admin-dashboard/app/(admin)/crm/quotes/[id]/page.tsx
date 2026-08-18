"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQuote } from "@/lib/hooks/useQuotes";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { LineItemsEditor } from "@/components/shared/LineItemsEditor";

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: quote, isLoading } = useQuote(id);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Quote not found.</p>
        <Link href="/crm/quotes" className="text-primary text-sm mt-2 inline-block">← Back to Quotes</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm/quotes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground font-mono">{quote.number}</h1>
              <StatusBadge status={quote.status} size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {quote.client?.name ?? "No client"} · Created {new Date(quote.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
        <MoneyDisplay amount={quote.total} size="xl" className="text-foreground" />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-5">Line Items</h2>
        <LineItemsEditor value={quote.lineItems ?? []} onChange={() => {}} readOnly />
      </div>

      {quote.notes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
