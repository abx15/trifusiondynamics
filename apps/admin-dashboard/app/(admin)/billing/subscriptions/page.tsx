"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";

interface Subscription {
  id: string;
  clientId: string;
  name: string;
  amount: number;
  frequency: string;
  status: string;
  nextBillingDate?: string;
  client?: { name: string };
}

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/billing/subscriptions");
      return data as { data: Subscription[]; total: number };
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Recurring billing plans</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}</div>
      ) : (data?.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <RefreshCw className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No subscriptions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.data ?? []).map((sub) => (
            <div key={sub.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{sub.name}</p>
                <p className="text-xs text-muted-foreground">{sub.client?.name ?? "—"} · {sub.frequency}</p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={sub.status} />
                <MoneyDisplay amount={sub.amount} size="md" className="text-foreground font-semibold" />
                {sub.nextBillingDate && (
                  <span className="text-xs text-muted-foreground">
                    Next: {new Date(sub.nextBillingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
