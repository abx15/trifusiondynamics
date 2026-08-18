"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useLeaves, useReviewLeave, type Leave } from "@/lib/hooks/useHR";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Check, X, Filter } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function LeavesManagementPage() {
  const { data: leaves = [], isLoading } = useLeaves();
  const reviewLeave = useReviewLeave();

  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [employeeSearch, setEmployeeSearch] = React.useState<string>("");

  // Dialog State
  const [selectedLeave, setSelectedLeave] = React.useState<Leave | null>(null);
  const [reviewAction, setReviewAction] = React.useState<"APPROVED" | "REJECTED" | null>(null);

  // Filtered leave list
  const filteredLeaves = React.useMemo(() => {
    return leaves.filter((leave) => {
      const matchStatus = statusFilter ? leave.status === statusFilter : true;
      const empName = leave.employee?.user?.name || "";
      const matchEmployee = employeeSearch
        ? empName.toLowerCase().includes(employeeSearch.toLowerCase())
        : true;
      return matchStatus && matchEmployee;
    });
  }, [leaves, statusFilter, employeeSearch]);

  const handleReviewClick = (leave: Leave, action: "APPROVED" | "REJECTED") => {
    setSelectedLeave(leave);
    setReviewAction(action);
  };

  const handleConfirmReview = () => {
    if (!selectedLeave || !reviewAction) return;

    reviewLeave.mutate(
      {
        id: selectedLeave.id,
        status: reviewAction,
      },
      {
        onSuccess: () => {
          toast.success(`Successfully ${reviewAction.toLowerCase()} leave request.`);
          setSelectedLeave(null);
          setReviewAction(null);
        },
        onError: () => {
          toast.error("Failed to submit review.");
        },
      }
    );
  };

  const columns = [
    {
      key: "employeeCode",
      header: "Employee",
      render: (row: Leave) => (
        <div>
          <p className="font-semibold text-foreground">{row.employee?.user?.name || "Unknown"}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{row.employee?.employeeCode}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row: Leave) => (
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-foreground uppercase">
          {row.type}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Duration",
      render: (row: Leave) => (
        <span className="text-xs">
          {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row: Leave) => (
        <p className="text-xs text-muted-foreground max-w-[240px] truncate" title={row.reason || ""}>
          {row.reason || "—"}
        </p>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Leave) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row: Leave) => {
        if (row.status !== "PENDING") {
          return <span className="text-xs text-muted-foreground font-medium italic">Reviewed</span>;
        }

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReviewClick(row, "APPROVED")}
              className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 p-1.5 h-8"
              disabled={reviewLeave.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReviewClick(row, "REJECTED")}
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 p-1.5 h-8"
              disabled={reviewLeave.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        breadcrumbs={[{ label: "Operations" }, { label: "HR Portal" }, { label: "Leaves" }]}
      />

      {/* Filter Board */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 border border-border p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2 font-medium">
          <Filter className="h-4 w-4" />
          Filter:
        </div>

        <input
          type="text"
          placeholder="Search by employee name..."
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          className="text-xs border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {(statusFilter || employeeSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("");
              setEmployeeSearch("");
            }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Leaves Table */}
      <DataTable
        columns={columns}
        data={filteredLeaves}
        isLoading={isLoading}
        emptyMessage="No leave requests matching your query."
      />

      {/* Review Dialog */}
      <ConfirmDialog
        open={!!selectedLeave}
        onClose={() => {
          setSelectedLeave(null);
          setReviewAction(null);
        }}
        onConfirm={handleConfirmReview}
        loading={reviewLeave.isPending}
        title={reviewAction === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
        description={`Are you sure you want to mark this leave request for ${
          selectedLeave?.employee?.user?.name || "this employee"
        } as ${reviewAction?.toLowerCase()}?`}
        confirmLabel={reviewAction === "APPROVED" ? "Approve" : "Reject"}
        destructive={reviewAction === "REJECTED"}
      />
    </div>
  );
}
