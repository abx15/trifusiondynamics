"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCreateProject } from "@/lib/hooks/useProjects";
import { useClients } from "@/lib/hooks/useClients";
import { toast } from "@/lib/toast";

const schema = z.object({
  name: z.string().min(2, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  budget: z.preprocess((val) => (val === "" || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)), z.number().min(0).optional()),
});
type FormValues = z.infer<typeof schema>;

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const { data: clients } = useClients({ limit: 100 });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: "PLANNING", priority: "MEDIUM" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const project = await createProject.mutateAsync(values);
      toast.success("Project created");
      router.push(`/projects/${project.id}`);
    } catch {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Project</h1>
          <p className="text-sm text-muted-foreground">Create a new project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Project Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Project Name *</label>
              <input {...register("name")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Website Redesign" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
              <textarea {...register("description")} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="Project scope and objectives..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Client</label>
              <select {...register("clientId")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">No client</option>
                {clients?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Budget (₹)</label>
              <input {...register("budget")} type="number" min={0} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="250000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <select {...register("status")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                {["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
              <select {...register("priority")} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date</label>
              <input {...register("startDate")} type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Due Date</label>
              <input {...register("dueDate")} type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/projects" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
