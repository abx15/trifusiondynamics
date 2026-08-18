"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCreateLead, type Lead } from "@/lib/hooks/useLeads";
import { toast } from "@/lib/toast";

const STAGES: Lead["stage"][] = [
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST",
];

const SOURCES = ["Website", "Referral", "LinkedIn", "Cold Email", "Event", "Other"];

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  stage: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  value: z.preprocess((val) => (val === "" || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)), z.number().min(0).optional()),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultStage = (searchParams.get("stage") as Lead["stage"]) || "NEW";
  const createLead = useCreateLead();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { stage: defaultStage },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const lead = await createLead.mutateAsync(values);
      toast.success("Lead created successfully");
      router.push(`/crm/leads/${lead.id}`);
    } catch {
      toast.error("Failed to create lead");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/crm"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Lead</h1>
          <p className="text-sm text-muted-foreground">Add a lead to the pipeline</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Lead Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Full Name *
              </label>
              <input
                {...register("name")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="john@company.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Phone
              </label>
              <input
                {...register("phone")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Company
              </label>
              <input
                {...register("company")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Estimated Value (₹)
              </label>
              <input
                {...register("value")}
                type="number"
                min={0}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Stage
              </label>
              <select
                {...register("stage")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Lead Source
              </label>
              <select
                {...register("source")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select source...</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Notes
              </label>
              <textarea
                {...register("notes")}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Any relevant context..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/crm"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Lead
          </button>
        </div>
      </form>
    </div>
  );
}
