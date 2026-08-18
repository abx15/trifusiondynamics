"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Inbox, User2, Mail, Phone, Building2, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  status?: "NEW" | "CONTACTED" | "ARCHIVED";
  createdAt: string;
}

export default function LeadsInboxPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [promoting, setPromoting] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads-inbox"],
    queryFn: async () => {
      const { data } = await apiClient.get("/crm/contact-submissions");
      return data as { data: ContactSubmission[]; total: number };
    },
    staleTime: 30_000,
  });

  const handlePromote = async (sub: ContactSubmission) => {
    if (sub.status && sub.status !== "NEW") {
      toast.info("This submission has already been promoted");
      return;
    }

    setPromoting(sub.id);
    try {
      const { data: lead } = await apiClient.post(`/crm/leads/from-submission/${sub.id}`);
      toast.success(`${sub.name} promoted to lead`);
      await queryClient.invalidateQueries({ queryKey: ["leads-inbox"] });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      router.push("/crm");
    } catch {
      toast.error("Failed to promote to lead");
    } finally {
      setPromoting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Leads Inbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Public contact form submissions — review raw inquiries and promote to CRM pipeline
          </p>
        </div>
        {data && (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {data.data.filter((s) => s.status === "NEW").length} Unprocessed Inquiries
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Inbox className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No submissions yet. The inbox is empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.data ?? []).map((sub) => {
            const isPromoted = sub.status === "CONTACTED" || sub.status === "ARCHIVED";

            return (
              <div
                key={sub.id}
                className={`rounded-xl border p-5 flex items-start justify-between gap-4 transition-all ${
                  isPromoted
                    ? "border-border/60 bg-card/50 opacity-80"
                    : "border-border bg-card hover:shadow-sm"
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <User2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{sub.name}</p>
                        {isPromoted && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Promoted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {sub.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {sub.email}
                      </span>
                    )}
                    {sub.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {sub.phone}
                      </span>
                    )}
                    {sub.company && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {sub.company}
                      </span>
                    )}
                  </div>

                  {sub.message && (
                    <p className="text-sm text-foreground line-clamp-2 bg-slate-50 dark:bg-zinc-900/60 rounded-lg px-3 py-2">
                      {sub.message}
                    </p>
                  )}
                </div>

                {isPromoted ? (
                  <button
                    disabled
                    className="flex items-center gap-1.5 shrink-0 rounded-lg bg-muted text-muted-foreground px-3 py-2 text-xs font-semibold cursor-not-allowed opacity-70"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Promoted
                  </button>
                ) : (
                  <button
                    onClick={() => handlePromote(sub)}
                    disabled={promoting === sub.id}
                    className="flex items-center gap-2 shrink-0 rounded-lg bg-primary text-primary-foreground hover:opacity-90 px-3.5 py-2 text-xs font-semibold transition-all disabled:opacity-60 shadow-sm"
                  >
                    {promoting === sub.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Promote to Lead
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
