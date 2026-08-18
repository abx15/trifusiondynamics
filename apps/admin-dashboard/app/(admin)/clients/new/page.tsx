"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCreateClient } from "@/lib/hooks/useClients";
import { toast } from "@/lib/toast";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NewClientPage() {
  const router = useRouter();
  const createClient = useCreateClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const client = await createClient.mutateAsync(values);
      toast.success("Client created");
      router.push(`/clients/${client.id}`);
    } catch {
      toast.error("Failed to create client");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Client</h1>
          <p className="text-sm text-muted-foreground">Add a client to your account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Client Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name / Contact *</label>
              <input {...register("name")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Rohan Mehta" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Company</label>
              <input {...register("company")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Acme Pvt Ltd" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">GST Number</label>
              <input {...register("gstNumber")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="29ABCDE1234F1Z5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
              <input {...register("email")} type="email" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="rohan@acme.com" />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone</label>
              <input {...register("phone")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">City</label>
              <input {...register("city")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Country</label>
              <input {...register("country")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="India" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Address</label>
              <textarea {...register("address")} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="123 Business Park, Andheri East" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
              <textarea {...register("notes")} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="Any additional context..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/clients" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Client
          </button>
        </div>
      </form>
    </div>
  );
}
