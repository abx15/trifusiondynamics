"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Plus,
  UserCheck,
} from "lucide-react";
import { useLead, useCreateFollowUp, useConvertLead } from "@/lib/hooks/useLeads";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "@/lib/toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const followupSchema = z.object({
  note: z.string().min(3, "Note is required"),
  method: z.string().min(1, "Method is required"),
  scheduledAt: z.string().optional(),
});

type FollowupForm = z.infer<typeof followupSchema>;

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: lead, isLoading } = useLead(id);
  const createFollowup = useCreateFollowUp();
  const convertLead = useConvertLead();
  const [showConvert, setShowConvert] = React.useState(false);
  const [showFollowupForm, setShowFollowupForm] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FollowupForm>({ resolver: zodResolver(followupSchema) });

  const onFollowup = async (data: FollowupForm) => {
    try {
      await createFollowup.mutateAsync({ leadId: id, ...data });
      toast.success("Follow-up logged");
      reset();
      setShowFollowupForm(false);
    } catch {
      toast.error("Failed to log follow-up");
    }
  };

  const handleConvert = async () => {
    try {
      await convertLead.mutateAsync(id);
      toast.success("Lead converted to client!");
      setShowConvert(false);
      router.push("/clients");
    } catch {
      toast.error("Conversion failed");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Lead not found.</p>
        <Link href="/crm" className="text-primary text-sm mt-2 inline-block">
          ← Back to CRM
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/crm"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{lead.name}</h1>
              <StatusBadge status={lead.stage} size="md" />
            </div>
            {lead.company && (
              <p className="text-sm text-muted-foreground mt-0.5">{lead.company}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowConvert(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          <UserCheck className="h-4 w-4" />
          Convert to Client
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Mail, label: "Email", value: lead.email },
          { icon: Phone, label: "Phone", value: lead.phone },
          { icon: Building2, label: "Company", value: lead.company },
          { icon: DollarSign, label: "Value", value: lead.value ? <MoneyDisplay amount={lead.value} size="md" /> : null },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {lead.notes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Notes
          </h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{lead.notes}</p>
        </div>
      )}

      {/* Follow-up Timeline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Follow-up Timeline</h3>
          <button
            onClick={() => setShowFollowupForm(!showFollowupForm)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Follow-up
          </button>
        </div>

        {showFollowupForm && (
          <form onSubmit={handleSubmit(onFollowup)} className="mb-5 p-4 rounded-lg border border-border bg-slate-50 dark:bg-zinc-900 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Method</label>
                <select
                  {...register("method")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select...</option>
                  {["Email", "Call", "Meeting", "WhatsApp", "LinkedIn"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {errors.method && <p className="mt-1 text-xs text-red-500">{errors.method.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Scheduled At</label>
                <input
                  {...register("scheduledAt")}
                  type="datetime-local"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Note *</label>
              <textarea
                {...register("note")}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="What happened? What was discussed?"
              />
              {errors.note && <p className="mt-1 text-xs text-red-500">{errors.note.message}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowFollowupForm(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Timeline items */}
        <div className="space-y-3">
          {(lead.followUps ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No follow-ups yet. Log the first one!
            </p>
          ) : (
            [...(lead.followUps ?? [])]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((f) => (
                <div key={f.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      {f.completedAt ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="w-px flex-1 bg-border mt-1" />
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">{f.method}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(f.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{f.note}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showConvert}
        onClose={() => setShowConvert(false)}
        onConfirm={handleConvert}
        title="Convert Lead to Client?"
        description={`This will convert "${lead.name}" into a full client record. You can then create projects and invoices for them.`}
        confirmLabel="Convert"
        loading={convertLead.isPending}
      />
    </div>
  );
}
