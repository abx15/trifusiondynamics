"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useEmployee, useEmployeeAttendanceSummary, useUpdateEmployee } from "@/lib/hooks/useHR";
import { toast } from "@/lib/toast";
import { Calendar, Clock, User, Briefcase, FileText, ArrowLeft, Loader2, RefreshCw } from "lucide-react";

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: employee, isLoading, error } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();

  // Attendance summary (uses current month/year by default)
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const { data: attendance, isLoading: isLoadingAttendance, refetch: refetchAttendance } =
    useEmployeeAttendanceSummary(id, currentMonth, currentYear);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-8 text-center text-rose-500 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100 rounded-xl space-y-3">
        <p className="font-semibold">Error loading employee profile</p>
        <p className="text-xs text-muted-foreground">The profile might not exist or you lack permissions.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/hr/employees")}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const handleStatusChange = (newStatus: "ACTIVE" | "ON_LEAVE" | "RESIGNED" | "TERMINATED") => {
    updateEmployee.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Updated status to ${newStatus}`);
        },
        onError: () => {
          toast.error("Failed to update status.");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/hr/employees")} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={`${employee.user?.name || "Employee Profile"}`}
          breadcrumbs={[
            { label: "Operations" },
            { label: "HR Portal", href: "/hr/employees" },
            { label: "Employees", href: "/hr/employees" },
            { label: employee.employeeCode },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: General Info */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
            <CardHeader className="text-center pb-4 border-b border-border">
              <div className="mx-auto h-20 w-20 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 text-3xl font-bold font-sans">
                {employee.user?.name?.[0] || "E"}
              </div>
              <CardTitle className="mt-3 text-lg">{employee.user?.name}</CardTitle>
              <CardDescription className="text-xs font-mono">{employee.employeeCode}</CardDescription>
              <div className="mt-2.5">
                <StatusBadge status={employee.status} />
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Email</span>
                <span className="font-mono text-foreground">{employee.user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Department</span>
                <span className="text-foreground font-semibold">{employee.department || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Designation</span>
                <span className="text-foreground font-semibold">{employee.designation || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Employment Type</span>
                <span className="font-mono font-medium text-foreground uppercase">
                  {employee.employmentType?.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Joined On</span>
                <span className="text-foreground">
                  {new Date(employee.joiningDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Status Update Options for Admin */}
              <div className="pt-4 border-t border-border space-y-2">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Change Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["ACTIVE", "ON_LEAVE", "RESIGNED"] as const).map((st) => (
                    <Button
                      key={st}
                      variant={employee.status === st ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleStatusChange(st)}
                      className="text-[10px] h-7 px-2 py-0.5"
                      disabled={updateEmployee.isPending}
                    >
                      {st.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Box */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Employee Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {employee.documents && employee.documents.length > 0 ? (
                <div className="space-y-3">
                  {employee.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-border">
                      <div>
                        <p className="font-semibold text-foreground">{doc.type}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-semibold"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No documents uploaded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Attendance Summary & Leaves */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Attendance Summary */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Monthly Attendance Summary
                </CardTitle>
                <CardDescription className="text-xs">
                  Stats for current month ({new Date().toLocaleString("default", { month: "long" })})
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchAttendance()} className="h-7 w-7 p-0">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-5">
              {isLoadingAttendance ? (
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : attendance ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-border text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours Worked</p>
                    <p className="text-2xl font-bold text-foreground mt-1.5">{attendance.hoursWorked}h</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-border text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Late Count</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">{attendance.lateCount}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-border text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Punches Recorded</p>
                    <p className="text-2xl font-bold text-foreground mt-1.5">{attendance.totalPunches}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No attendance records found for this month.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave History Table */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Leave History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Duration</th>
                      <th className="py-3 px-2">Reason</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employee.leaves && employee.leaves.length > 0 ? (
                      employee.leaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                          <td className="py-3 px-2 font-mono font-medium text-foreground">
                            {leave.type}
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            {new Date(leave.startDate).toLocaleDateString()} -{" "}
                            {new Date(leave.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate" title={leave.reason || ""}>
                            {leave.reason || "—"}
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={leave.status} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No leave history available.
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
