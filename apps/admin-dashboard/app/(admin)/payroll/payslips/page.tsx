"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { usePayslips, type Payslip } from "@/lib/hooks/usePayroll";
import { ArrowLeft, ArrowUpRight, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPayslipsListPage() {
  const { data: payslips = [], isLoading } = usePayslips();

  const [employeeSearch, setEmployeeSearch] = React.useState("");

  const filteredPayslips = React.useMemo(() => {
    return payslips.filter((p) => {
      const name = p.employee?.user?.name || "";
      return name.toLowerCase().includes(employeeSearch.toLowerCase());
    });
  }, [payslips, employeeSearch]);

  const columns = [
    {
      key: "employee",
      header: "Employee",
      render: (row: Payslip) => (
        <div>
          <p className="font-semibold text-foreground">{row.employee?.user?.name || "Unknown"}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{row.employee?.employeeCode}</p>
        </div>
      ),
    },
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
      header: "Gross",
      render: (row: Payslip) => <MoneyDisplay amount={Number(row.grossAmount)} size="sm" />,
    },
    {
      key: "tax",
      header: "Tax",
      render: (row: Payslip) => <MoneyDisplay amount={Number(row.tax)} size="sm" className="text-rose-500" />,
    },
    {
      key: "deductions",
      header: "Deductions",
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
          View Detail
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/payroll" passHref legacyBehavior>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Payslip Directory"
          breadcrumbs={[{ label: "Operations" }, { label: "Payroll Management", href: "/payroll" }, { label: "Payslips" }]}
        />
      </div>

      {/* Filters board */}
      <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-border p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2 font-medium">
          <Filter className="h-4 w-4" />
          Filter:
        </div>
        <input
          type="text"
          placeholder="Search by employee name..."
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          className="text-xs border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-w-[250px]"
        />
        {employeeSearch && (
          <Button variant="ghost" size="sm" onClick={() => setEmployeeSearch("")} className="text-xs">
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredPayslips}
        isLoading={isLoading}
        emptyMessage="No payslips generated matching your criteria."
      />
    </div>
  );
}
