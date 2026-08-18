"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useLeaves, useCreateLeave, type Leave } from "@/lib/hooks/useHR";
import { toast } from "@/lib/toast";
import { Loader2, Plus, Calendar, FileText, Filter } from "lucide-react";

export default function LeaveSelfServicePage() {
  const { data: leaves = [], isLoading } = useLeaves();
  const createLeave = useCreateLeave();

  // Form states
  const [type, setType] = React.useState<string>("CASUAL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !reason) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date.");
      return;
    }

    createLeave.mutate(
      {
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason,
      },
      {
        onSuccess: () => {
          toast.success("Leave application submitted successfully!");
          // Reset form
          setStartDate("");
          setEndDate("");
          setReason("");
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || "Failed to submit leave request.");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Leave Requests"
        breadcrumbs={[{ label: "Self-Service" }, { label: "Leaves" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Application Form */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Plus className="h-4 w-4 text-slate-400" />
                Apply for Leave
              </CardTitle>
              <CardDescription>Submit a new leave request for manager review.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Leave Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="EARNED">Earned Leave</option>
                    <option value="UNPAID">Unpaid Leave</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Reason</label>
                  <textarea
                    placeholder="e.g. Attending to personal affairs."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={createLeave.isPending || !startDate || !endDate || !reason}
                  className="w-full gap-2 mt-2"
                >
                  {createLeave.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Application
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Application History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-2">Type</th>
                      <th className="py-3.5 px-2">Duration</th>
                      <th className="py-3.5 px-2">Reason</th>
                      <th className="py-3.5 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx} className="h-12">
                          <td className="py-2 px-2"><div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" /></td>
                          <td className="py-2 px-2"><div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" /></td>
                          <td className="py-2 px-2"><div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" /></td>
                          <td className="py-2 px-2"><div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" /></td>
                        </tr>
                      ))
                    ) : leaves.length > 0 ? (
                      leaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                          <td className="py-3.5 px-2 font-mono font-medium text-foreground">
                            {leave.type}
                          </td>
                          <td className="py-3.5 px-2 text-foreground">
                            {new Date(leave.startDate).toLocaleDateString()} -{" "}
                            {new Date(leave.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-2 text-muted-foreground max-w-[200px] truncate" title={leave.reason || ""}>
                            {leave.reason || "—"}
                          </td>
                          <td className="py-3.5 px-2">
                            <StatusBadge status={leave.status} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No leave applications recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
