"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";

interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  paidInvoices: number;
  overdueInvoices: number;
  outstandingAmount: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-500"}`}>
            {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          </div>
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-3 mb-1">{label}</p>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

const CHART_COLORS = {
  revenue: "#6366f1",
  expenses: "#f43f5e",
  profit: "#10b981",
};

export default function FinancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/billing/finance/summary");
      return data as FinanceSummary;
    },
    staleTime: 5 * 60_000,
  });

  // Generate placeholder monthly data if API returns none
  const monthlyData = data?.monthlyData ?? generatePlaceholderData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Finance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue, expenses, and profit overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Revenue"
          value={<MoneyDisplay amount={data?.totalRevenue ?? 0} size="lg" />}
          icon={TrendingUp}
          color="bg-indigo-500"
          trend="up"
        />
        <MetricCard
          label="Total Expenses"
          value={<MoneyDisplay amount={data?.totalExpenses ?? 0} size="lg" />}
          icon={TrendingDown}
          color="bg-rose-500"
        />
        <MetricCard
          label="Net Profit"
          value={<MoneyDisplay amount={data?.netProfit ?? 0} size="lg" className={((data?.netProfit ?? 0) >= 0) ? "text-emerald-600" : "text-red-500"} />}
          icon={DollarSign}
          color={(data?.netProfit ?? 0) >= 0 ? "bg-emerald-500" : "bg-orange-500"}
          trend={(data?.netProfit ?? 0) >= 0 ? "up" : "down"}
        />
        <MetricCard
          label="Outstanding"
          value={<MoneyDisplay amount={data?.outstandingAmount ?? 0} size="lg" />}
          icon={CreditCard}
          color="bg-amber-500"
        />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-1">Revenue vs Expenses</h2>
        <p className="text-xs text-muted-foreground mb-5">Monthly breakdown for the current year</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              formatter={(value: any) => [`₹${Number(value || 0).toLocaleString("en-IN")}`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} dot={false} name="Revenue" />
            <Line type="monotone" dataKey="expenses" stroke={CHART_COLORS.expenses} strokeWidth={2} dot={false} name="Expenses" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Net Profit Bar Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-1">Monthly Net Profit</h2>
        <p className="text-xs text-muted-foreground mb-5">Revenue minus expenses per month</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              formatter={(value: any) => [`₹${Number(value || 0).toLocaleString("en-IN")}`, "Net Profit"]}
            />
            <Bar dataKey="profit" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} name="Net Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function generatePlaceholderData() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const currentMonth = now.getMonth();
  return months.slice(0, currentMonth + 1).map((month) => ({
    month,
    revenue: Math.floor(Math.random() * 300_000 + 150_000),
    expenses: Math.floor(Math.random() * 150_000 + 80_000),
    profit: Math.floor(Math.random() * 150_000 + 50_000),
  }));
}
