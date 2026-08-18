"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useWorkflow, useWorkflowRuns, useTriggerWorkflow } from "@/lib/hooks/useAutomation";
import { toast } from "@/lib/toast";
import { ArrowLeft, Play, Cpu, History, Loader2, RefreshCw, Send, AlertTriangle } from "lucide-react";

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: workflow, isLoading, error } = useWorkflow(id);
  const { data: runs = [], isLoading: isLoadingRuns, refetch: refetchRuns } = useWorkflowRuns(id);
  const triggerWorkflow = useTriggerWorkflow();

  const handleTriggerNow = () => {
    triggerWorkflow.mutate(id, {
      onSuccess: (data) => {
        toast.success(`Workflow triggered successfully! Run ID: ${data.runId.slice(0, 8)}...`);
        refetchRuns();
      },
      onError: () => {
        toast.error("Failed to trigger workflow manually.");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="p-8 text-center text-rose-500 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100 rounded-xl space-y-3">
        <p className="font-semibold">Error loading workflow details</p>
        <p className="text-xs text-muted-foreground">The workflow might not exist or has been deleted.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/automation")}>
          Back to Automations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/automation")} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title={workflow.name}
            breadcrumbs={[
              { label: "Technical Assets" },
              { label: "Automations", href: "/automation" },
              { label: workflow.id.slice(0, 8) + "..." },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchRuns()} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleTriggerNow}
            disabled={triggerWorkflow.isPending || !workflow.isActive}
            className="gap-2"
          >
            {triggerWorkflow.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Trigger Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Read Only Config Summary */}
        <div className="lg:col-span-1 space-y-6 text-xs font-sans">
          
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-400" />
                Workflow Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</p>
                <p className="text-foreground font-medium mt-1 leading-relaxed">{workflow.description || "No description provided."}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trigger Mechanism</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-foreground font-semibold">
                    {workflow.triggerType}
                  </span>
                  {workflow.triggerType === "CRON" && (
                    <span className="font-mono font-medium text-muted-foreground">({workflow.triggerConfig?.expression})</span>
                  )}
                  {workflow.triggerType === "EVENT" && (
                    <span className="font-mono font-medium text-muted-foreground">({workflow.triggerConfig?.event})</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Status</p>
                <div className="mt-1">
                  <StatusBadge status={workflow.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action steps sequence details */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-slate-400" />
                Execution Steps ({workflow.steps?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {workflow.steps && workflow.steps.length > 0 ? (
                workflow.steps
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((step) => (
                    <div key={step.id} className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-border space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-foreground capitalize">{step.type.replace("_", " ")}</span>
                        <span className="font-mono text-[9px] bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-muted-foreground">
                          Node {step.sequence}
                        </span>
                      </div>
                      
                      {step.type === "LOG" && (
                        <p className="text-muted-foreground font-mono text-[10px] truncate" title={step.config?.message}>
                          Log: "{step.config?.message}"
                        </p>
                      )}
                      {step.type === "WEBHOOK" && (
                        <p className="text-muted-foreground font-mono text-[10px] truncate" title={step.config?.url}>
                          URL: {step.config?.url}
                        </p>
                      )}
                      {step.type === "EMAIL" && (
                        <p className="text-muted-foreground font-mono text-[10px] truncate" title={step.config?.email}>
                          Send: {step.config?.email} ("{step.config?.subject}")
                        </p>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-center py-6 text-slate-400 italic">No execution steps configured.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Execution History Logs */}
        <div className="lg:col-span-2 space-y-6 text-xs">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md h-full min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Execution History Logs
              </CardTitle>
              <CardDescription className="text-xs">Recent execution run logs and statuses.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
              
              {isLoadingRuns ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : runs.length > 0 ? (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      className="border border-border bg-slate-50/40 dark:bg-zinc-800/10 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="font-bold text-foreground">RUN ID:</span>
                          <span className="text-muted-foreground">{run.id.slice(0, 8)}...</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {new Date(run.triggeredAt).toLocaleString()}
                          </span>
                        </div>
                        <StatusBadge status={run.status} />
                      </div>

                      {run.logs && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution Logs Output</p>
                          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg whitespace-pre-wrap font-mono text-[10px] leading-relaxed border border-zinc-800">
                            {run.logs}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 gap-2">
                  <AlertTriangle className="h-12 w-12 text-slate-200 dark:text-zinc-800" />
                  <p className="font-semibold">No execution history found</p>
                  <p className="text-xs text-muted-foreground">Trigger this workflow manually or wait for scheduled run.</p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
