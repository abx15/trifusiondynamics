"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { useWorkflows, useToggleWorkflow, type Workflow } from "@/lib/hooks/useAutomation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Plus, ToggleLeft, ToggleRight, Play, Cpu } from "lucide-react";

export default function WorkflowsListPage() {
  const router = useRouter();
  const { data: workflows = [], isLoading, refetch } = useWorkflows();
  const toggleWorkflow = useToggleWorkflow();

  const handleToggle = (e: React.MouseEvent, wf: Workflow) => {
    e.stopPropagation(); // Avoid row click navigation trigger
    toggleWorkflow.mutate(
      { id: wf.id, isActive: !wf.isActive },
      {
        onSuccess: (data) => {
          toast.success(`Workflow "${data.name}" is now ${data.isActive ? "Active" : "Inactive"}`);
        },
        onError: () => {
          toast.error("Failed to toggle workflow status.");
        },
      }
    );
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: Workflow) => (
        <div>
          <p className="font-bold text-foreground text-sm">{row.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{row.description || "No description provided."}</p>
        </div>
      ),
    },
    {
      key: "triggerType",
      header: "Trigger",
      render: (row: Workflow) => (
        <span className="text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-foreground">
          {row.triggerType}
        </span>
      ),
    },
    {
      key: "triggerConfig",
      header: "Trigger Details",
      render: (row: Workflow) => {
        if (row.triggerType === "CRON") {
          return <span className="font-mono text-xs text-muted-foreground">Cron: {row.triggerConfig?.expression || "—"}</span>;
        }
        if (row.triggerType === "WEBHOOK") {
          return <span className="font-mono text-xs text-muted-foreground">Endpoint: /webhook/...</span>;
        }
        return <span className="text-xs text-muted-foreground">Event: {row.triggerConfig?.event || "—"}</span>;
      },
    },
    {
      key: "stepsCount",
      header: "Steps",
      render: (row: Workflow) => (
        <span className="text-xs font-semibold text-foreground">
          {row.steps?.length || 0} steps
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created On",
      render: (row: Workflow) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Active",
      className: "text-center",
      render: (row: Workflow) => (
        <button
          onClick={(e) => handleToggle(e, row)}
          disabled={toggleWorkflow.isPending}
          className="text-primary hover:scale-105 transition-transform cursor-pointer disabled:opacity-50"
        >
          {row.isActive ? (
            <ToggleRight className="h-7 w-7 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-7 w-7 text-slate-400" />
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Workflow Automations"
          breadcrumbs={[{ label: "Technical Assets" }, { label: "Automations" }]}
        />
        <Link href="/automation/new" passHref legacyBehavior>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Build Workflow
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={workflows}
        isLoading={isLoading}
        emptyMessage="No workflow automations built yet."
        onRowClick={(row) => router.push(`/automation/${row.id}`)}
      />
    </div>
  );
}
