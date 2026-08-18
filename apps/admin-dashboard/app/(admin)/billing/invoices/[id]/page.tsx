"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, Download, CreditCard } from "lucide-react";
import { useInvoice, useRecordPayment } from "@/lib/hooks/useInvoices";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { LineItemsEditor } from "@/components/shared/LineItemsEditor";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "@/lib/toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient } from "@/lib/api-client";

const paymentSchema = z.object({
  amount: z.number().min(1, "Amount required"),
  method: z.string().min(1, "Method required"),
  reference: z.string().optional(),
  paidAt: z.string().min(1, "Date required"),
});
type PaymentForm = z.infer<typeof paymentSchema>;

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: invoice, isLoading } = useInvoice(id);
  const recordPayment = useRecordPayment();
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paidAt: today, method: "Bank Transfer" },
  });

  const onPayment = async (data: PaymentForm) => {
    try {
      await recordPayment.mutateAsync({ invoiceId: id, ...data });
      toast.success("Payment recorded");
      reset();
      setShowPaymentModal(false);
    } catch {
      toast.error("Failed to record payment");
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await apiClient.get(`/portal/invoices/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice?.number ?? id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Link href="/billing/invoices" className="text-primary text-sm mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  const amountPaid = (invoice.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const amountDue = invoice.total - amountPaid;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/billing/invoices" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground font-mono">{invoice.number}</h1>
              <StatusBadge status={invoice.status} size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoice.client?.name ?? "—"} · Due {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-60 transition-colors">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          {invoice.status !== "PAID" && (
            <button onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
              <CreditCard className="h-4 w-4" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Invoice Total", value: <MoneyDisplay amount={invoice.total} size="lg" /> },
          { label: "Amount Paid", value: <MoneyDisplay amount={amountPaid} size="lg" className="text-green-600" /> },
          { label: "Amount Due", value: <MoneyDisplay amount={amountDue} size="lg" className={amountDue > 0 ? "text-red-500" : "text-green-600"} /> },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-5">Line Items</h2>
        <LineItemsEditor value={invoice.lineItems ?? []} onChange={() => {}} readOnly />
      </div>

      {/* Payment History */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Payment History</h2>
        {(invoice.payments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {invoice.payments!.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-slate-50/60 dark:bg-zinc-900/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.method}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {p.reference && ` · Ref: ${p.reference}`}
                  </p>
                </div>
                <MoneyDisplay amount={p.amount} size="md" className="text-green-600 font-semibold" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Record Payment</h3>
            <form onSubmit={handleSubmit(onPayment)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount (₹) *</label>
                <input {...register("amount", { valueAsNumber: true })} type="number" step={0.01} defaultValue={amountDue} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Method *</label>
                <select {...register("method")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {["Bank Transfer", "UPI", "Cash", "Cheque", "Credit Card", "Other"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reference / Transaction ID</label>
                <input {...register("reference")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="UTR / Txn ID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Date *</label>
                <input {...register("paidAt")} type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
