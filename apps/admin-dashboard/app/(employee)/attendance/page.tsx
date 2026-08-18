"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useEmployeeMe, useEmployeeAttendanceSummary } from "@/lib/hooks/useHR";
import { toast } from "@/lib/toast";
import { LogIn, LogOut, Clock, ShieldCheck, MapPin, Loader2, Calendar } from "lucide-react";

export default function AttendanceSelfServicePage() {
  const queryClient = useQueryClient();

  // 1. Fetch current employee
  const { data: employee } = useEmployeeMe();
  const employeeId = employee?.id || "";

  // 2. Fetch today's status
  const { data: todayStatus, isLoading: isLoadingToday } = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/attendance/me/today");
      return data as { isCheckedIn: boolean; punches: any[] };
    },
  });

  // 3. Fetch monthly summary
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const { data: summary, isLoading: isLoadingSummary } = useEmployeeAttendanceSummary(
    employeeId,
    currentMonth,
    currentYear
  );

  // 4. Punch mutations
  const checkInMutation = useMutation({
    mutationFn: async (location: string) => {
      const { data } = await apiClient.post("/hr/attendance/check-in", { location });
      return data;
    },
    onSuccess: () => {
      toast.success("Successfully Checked In!");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to check in.");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (location: string) => {
      const { data } = await apiClient.post("/hr/attendance/check-out", { location });
      return data;
    },
    onSuccess: () => {
      toast.success("Successfully Checked Out!");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to check out.");
    },
  });

  const handlePunch = () => {
    const location = "Web Portal";
    if (todayStatus?.isCheckedIn) {
      checkOutMutation.mutate(location);
    } else {
      checkInMutation.mutate(location);
    }
  };

  // Generate calendar days for current month
  const calendarDays = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0

    const days = [];
    // padding for previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, status: "empty" });
    }

    // populate current month days
    const punches = summary?.punches || [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toDateString();
      
      // Check punches for this day
      const dayPunches = punches.filter((p: any) => {
        return new Date(p.timestamp).toDateString() === dateStr;
      });

      let status = "absent"; // default if no punches and it is in past
      const todayDate = new Date();
      
      if (new Date(year, month, d) > todayDate) {
        status = "future";
      } else if (new Date(year, month, d).toDateString() === todayDate.toDateString()) {
        status = todayStatus?.isCheckedIn ? "present" : "pending";
      } else if (dayPunches.length > 0) {
        // Check if any check-in was late (after 10:00 AM)
        const hasLate = dayPunches.some((p: any) => {
          if (p.type === "check_in") {
            const hour = new Date(p.timestamp).getHours();
            return hour >= 10;
          }
          return false;
        });
        status = hasLate ? "late" : "present";
      } else if (new Date(year, month, d).getDay() === 0 || new Date(year, month, d).getDay() === 6) {
        // Weekends
        status = "weekend";
      }

      days.push({ day: d, status });
    }

    return days;
  }, [summary, todayStatus]);

  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        breadcrumbs={[{ label: "Self-Service" }, { label: "Attendance" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Punch In/Out Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Work Shift Logger
              </CardTitle>
              <CardDescription>Record check-in and check-out to log working hours.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6 text-center space-y-5">
              
              {/* Giant Button */}
              {isLoadingToday ? (
                <div className="h-32 w-32 rounded-full border-4 border-dashed border-border flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <button
                  onClick={handlePunch}
                  disabled={isPending}
                  className={`h-32 w-32 rounded-full border-4 shadow-lg flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50 ${
                    todayStatus?.isCheckedIn
                      ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 hover:bg-rose-100"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100"
                  }`}
                >
                  {todayStatus?.isCheckedIn ? (
                    <>
                      <LogOut className="h-8 w-8 mb-1 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider">Check Out</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-8 w-8 mb-1" />
                      <span className="text-xs font-bold uppercase tracking-wider">Check In</span>
                    </>
                  )}
                </button>
              )}

              {/* Status Display */}
              <div className="text-xs">
                <p className="text-muted-foreground font-medium">Status Today:</p>
                <p className="font-bold text-foreground mt-1 text-sm">
                  {todayStatus?.isCheckedIn ? "Currently Active (Working)" : "Not Checked In"}
                </p>
              </div>

              {/* Punch Logs */}
              <div className="w-full text-xs border-t border-border pt-4 text-left space-y-2">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Today's Activity</p>
                {todayStatus?.punches && todayStatus.punches.length > 0 ? (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {todayStatus.punches.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-zinc-800/40 rounded border border-border">
                        <span className="font-semibold text-foreground capitalize">{p.type.replace("_", " ")}</span>
                        <span className="font-mono text-muted-foreground">
                          {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">No punches recorded today.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Month Summary
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Visual logs for {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
                  </CardDescription>
                </div>
                {summary && (
                  <div className="text-xs font-semibold text-foreground">
                    {summary.hoursWorked}h logged · {summary.lateCount} late
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              
              {/* Color Indicators */}
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-muted-foreground border-b border-border pb-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 bg-emerald-500 rounded" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 bg-amber-500 rounded" />
                  <span>Late (&gt;10:00 AM)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 bg-rose-500 rounded" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 bg-slate-200 dark:bg-zinc-800 rounded" />
                  <span>Weekend</span>
                </div>
              </div>

              {/* Grid Calendar */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>

                {isLoadingSummary ? (
                  Array.from({ length: 35 }).map((_, idx) => (
                    <div key={idx} className="h-9 rounded-lg bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                  ))
                ) : (
                  calendarDays.map((dayObj, idx) => {
                    if (dayObj.day === null) {
                      return <div key={idx} className="h-9" />;
                    }

                    let colorClass = "bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30"; // default absent
                    if (dayObj.status === "present") {
                      colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30";
                    } else if (dayObj.status === "late") {
                      colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30";
                    } else if (dayObj.status === "weekend") {
                      colorClass = "bg-slate-100 text-slate-400 dark:bg-zinc-800/40 dark:text-zinc-500 border-border";
                    } else if (dayObj.status === "future") {
                      colorClass = "bg-slate-50 text-slate-300 dark:bg-zinc-900/10 dark:text-zinc-700 border-border border-dashed";
                    } else if (dayObj.status === "pending") {
                      colorClass = "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 border-dashed animate-pulse";
                    }

                    return (
                      <div
                        key={idx}
                        className={`h-9 rounded-lg flex items-center justify-center border font-mono ${colorClass}`}
                      >
                        {dayObj.day}
                      </div>
                    );
                  })
                )}
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
