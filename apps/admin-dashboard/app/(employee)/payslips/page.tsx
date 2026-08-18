"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { usePayslips, type Payslip } from "@/lib/hooks/usePayroll";
import { Calendar, FileText, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function MyPayslipsPage() {
  const { data: payslips = [], isLoading } = usePayslips();

  const columns = [
    {
      key: "period",
      header: "Period",
      render: (row: Payslip) => {
        const date = new Date(row.year, row.month - 1);
        return (
          <span className="font-semibold text-foreground">
            {date.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
        );
      },
    },
    {
      key: "grossAmount",
      header: "Gross Salary",
      render: (row: Payslip) => <MoneyDisplay amount={Number(row.grossAmount)} size="sm" />,
    },
    {
      key: "tax",
      header: "Tax Deducted (5%)",
      render: (row: Payslip) => <MoneyDisplay amount={Number(row.tax)} size="sm" className="text-rose-500" />,
    },
    {
      key: "deductions",
      header: "Other Deductions",
      render: (row: Payslip) => <MoneyDisplay amount={Number(row.deductions)} size="sm" className="text-rose-500" />,
    },
    {
      key: "netAmount",
      header: "Net Pay",
      className: "font-bold",
      render: (row: Payslip) => <MoneyDisplay amount={Number(row.netAmount)} size="sm" className="text-emerald-600 dark:text-emerald-400" />,
    },
    {
      key: "status",
      header: "Status",
      render: (row: Payslip) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row: Payslip) => (
        <Link href={`/payroll/payslips/${row.id}`} className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold">
          View Payslip
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Payslips"
        breadcrumbs={[{ label: "Self-Service" }, { label: "Payslips" }]}
      />

      <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            Payslips Archive
          </CardTitle>
          <CardDescription>View and print your monthly generated payslips and tax breakdowns.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            columns={columns}
            data={payslips}
            isLoading={isLoading}
            emptyMessage="No payslips generated for your profile yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
