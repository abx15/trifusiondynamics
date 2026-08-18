"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCreateEstimate } from "@/lib/hooks/useEstimates";
import { useClients } from "@/lib/hooks/useClients";
import { LineItemsEditor, type LineItem } from "@/components/shared/LineItemsEditor";
import { toast } from "@/lib/toast";

const schema = z.object({
  clientId: z.string().optional(),
  status: z.enum(["DRAFT", "SENT"]),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NewEstimatePage() {
  const router = useRouter();
  const createEstimate = useCreateEstimate();
  const { data: clients } = useClients({ limit: 100 });
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 18, amount: 0 },
  ]);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "DRAFT" },
  });

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = lineItems.reduce((s, i) => s + (i.quantity * i.unitPrice * (i.taxRate ?? 0)) / 100, 0);
  const total = subtotal + taxAmount;

  const onSubmit = async (values: FormValues) => {
    try {
      const est = await createEstimate.mutateAsync({ ...values, lineItems, subtotal, taxAmount, total });
      toast.success("Estimate created");
      router.push(`/billing/estimates/${est.id}`);
    } catch {
      toast.error("Failed to create estimate");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing/estimates" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Estimate</h1>
          <p className="text-sm text-muted-foreground">Build a cost estimate for a client</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Estimate Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Client</label>
              <select {...register("clientId")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select client...</option>
                {clients?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Valid Until</label>
              <input {...register("validUntil")} type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
              <textarea {...register("notes")} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-5">Line Items</h2>
          <LineItemsEditor value={lineItems} onChange={setLineItems} />
        </div>
        <div className="flex justify-end gap-3">
          <Link href="/billing/estimates" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Estimate
          </button>
        </div>
      </form>
    </div>
  );
}
