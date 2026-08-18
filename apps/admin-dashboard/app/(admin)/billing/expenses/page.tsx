"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Plus, DollarSign, Loader2 } from "lucide-react";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/lib/toast";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category?: string;
  date: string;
  status: string;
  notes?: string;
}

const expenseSchema = z.object({
  title: z.string().min(2, "Title required"),
  amount: z.number().min(1, "Amount required"),
  category: z.string().optional(),
  date: z.string().min(1, "Date required"),
  notes: z.string().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

const CATEGORIES = ["Travel", "Software", "Office Supplies", "Marketing", "Utilities", "Payroll", "Other"];

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await apiClient.get("/billing/expenses");
      return data as { data: Expense[]; total: number };
    },
    staleTime: 60_000,
  });

  const createExpense = useMutation({
    mutationFn: async (payload: ExpenseForm) => {
      const { data } = await apiClient.post("/billing/expenses", payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense logged"); },
    onError: () => toast.error("Failed to log expense"),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: today },
  });

  const onSubmit = async (data: ExpenseForm) => {
    await createExpense.mutateAsync(data);
    reset({ date: today });
    setShowForm(false);
  };

  const total = (data?.data ?? []).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} records · Total: <MoneyDisplay amount={total} size="sm" className="text-muted-foreground" />
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Log Expense
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">New Expense</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title *</label>
              <input {...register("title")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="AWS invoice, Team lunch..." />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount (₹) *</label>
              <input {...register("amount", { valueAsNumber: true })} type="number" step={0.01} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
              <select {...register("category")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date *</label>
              <input {...register("date")} type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
              <input {...register("notes")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Optional notes..." />
            </div>
            <div className="col-span-3 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}</div>
      ) : (data?.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <DollarSign className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No expenses logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((exp) => (
            <div key={exp.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{exp.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.category && `${exp.category} · `}
                    {new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <MoneyDisplay amount={exp.amount} size="md" className="text-foreground font-semibold" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
