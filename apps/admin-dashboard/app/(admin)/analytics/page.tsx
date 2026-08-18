"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Loader2, RefreshCw, Calendar, Users, DollarSign, Award, ArrowUpRight } from "lucide-react";

export default function AnalyticsDashboardPage() {
  const [startDate, setStartDate] = React.useState("2026-01-01");
  const [endDate, setEndDate] = React.useState("2026-12-31");

  // Fetch Dashboard Stats
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["analytics", "dashboard", { startDate, endDate }],
    queryFn: async () => {
      const { data } = await apiClient.get("/analytics/dashboard");
      return data as { totalRevenue: number; totalClients: number; activeProjects: number };
    },
  });

  // Fetch Revenue trends
  const { data: revenueData = [], isLoading: isLoadingRevenue, refetch: refetchRevenue } = useQuery({
    queryKey: ["analytics", "revenue", { startDate, endDate }],
    queryFn: async () => {
      const { data } = await apiClient.get("/analytics/revenue", {
        params: { startDate, endDate },
      });
      return data as { date: string; amount: number }[];
    },
  });

  // Fetch Client Growth trends
  const { data: clientsData = [], isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
    queryKey: ["analytics", "clients", { startDate, endDate }],
    queryFn: async () => {
      const { data } = await apiClient.get("/analytics/clients", {
        params: { startDate, endDate },
      });
      return data as { date: string; count: number }[];
    },
  });

  // Fetch Top Performers
  const { data: teamData = [], isLoading: isLoadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ["analytics", "team-performance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/analytics/team-performance");
      return data as { employeeName: string; tasksCompleted: number; tasksValue: number }[];
    },
  });

  const recalculateMetrics = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/analytics/rollup/run-now");
      return data;
    },
    onSuccess: () => {
      toast.success("Metrics recalculated successfully!");
      refetchStats();
      refetchRevenue();
      refetchClients();
      refetchTeam();
    },
    onError: () => {
      toast.error("Failed to trigger rollup recalculation.");
    },
  });

  const handleRunNow = () => {
    recalculateMetrics.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Analytics Dashboard"
          breadcrumbs={[{ label: "Technical Assets" }, { label: "Analytics" }]}
        />
        <Button
          size="sm"
          onClick={handleRunNow}
          disabled={recalculateMetrics.isPending}
          className="gap-2 shrink-0 self-start md:self-auto"
        >
          {recalculateMetrics.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Recalculate Metrics
        </Button>
      </div>

      {/* Date Range Picker Panel */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 border border-border p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2 font-medium">
          <Calendar className="h-4 w-4" />
          Date Range:
        </div>
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground font-semibold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-extrabold text-foreground">
              {isLoadingStats ? "..." : `₹${stats?.totalRevenue?.toLocaleString("en-IN") || 0}`}
            </p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Client Accounts</p>
            <p className="text-2xl font-extrabold text-foreground">
              {isLoadingStats ? "..." : stats?.totalClients || 0}
            </p>
          </div>
          <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Projects</p>
            <p className="text-2xl font-extrabold text-foreground">
              {isLoadingStats ? "..." : stats?.activeProjects || 0}
            </p>
          </div>
          <div className="h-10 w-10 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center shrink-0">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Line Chart */}
        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Revenue Trends
            </CardTitle>
            <CardDescription className="text-xs">Financial performance over selected periods.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 h-80">
            {isLoadingRevenue ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Loading revenue trends...
              </div>
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Revenue Amount"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No revenue records matching your date query.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client growth Area Chart */}
        <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Client Growth
            </CardTitle>
            <CardDescription className="text-xs">Accumulated total client growth dynamics.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 h-80">
            {isLoadingClients ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Loading client growth data...
              </div>
            ) : clientsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={clientsData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Total Clients"
                    stroke="#3B82F6"
                    fill="rgba(59, 130, 246, 0.1)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No client metrics matching your date query.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Table */}
      <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Award className="h-4 w-4 text-purple-500" />
            Top Performers Directory
          </CardTitle>
          <CardDescription className="text-xs">Team production metrics based on completed task evaluations.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <th className="py-3 px-2">Member</th>
                  <th className="py-3 px-2">Tasks Completed</th>
                  <th className="py-3 px-2">Evaluated Project Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingTeam ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="h-12">
                      <td className="py-2 px-2"><div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" /></td>
                      <td className="py-2 px-2"><div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" /></td>
                      <td className="py-2 px-2"><div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : teamData.length > 0 ? (
                  teamData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                      <td className="py-3 px-2 font-semibold text-foreground">
                        {row.employeeName || "Unknown Member"}
                      </td>
                      <td className="py-3 px-2 text-foreground font-medium">
                        {row.tasksCompleted} tasks
                      </td>
                      <td className="py-3 px-2 text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹{row.tasksValue?.toLocaleString("en-IN") || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No team production records loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
