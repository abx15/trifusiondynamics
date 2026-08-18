"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useEmployees, type Employee } from "@/lib/hooks/useHR";
import { Button } from "@/components/ui/button";

export default function EmployeesListPage() {
  const router = useRouter();
  const [department, setDepartment] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");

  const { data: employees = [], isLoading } = useEmployees({
    department: department || undefined,
    status: status || undefined,
  });

  const columns = [
    {
      key: "employeeCode",
      header: "Code",
      className: "font-mono font-semibold text-xs",
    },
    {
      key: "name",
      header: "Name",
      render: (row: Employee) => (
        <div>
          <p className="font-semibold text-foreground">{row.user?.name || "Unlinked User"}</p>
          <p className="text-xs text-muted-foreground">{row.user?.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
    },
    {
      key: "department",
      header: "Department",
      render: (row: Employee) => (
        <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-medium text-foreground">
          {row.department || "—"}
        </span>
      ),
    },
    {
      key: "employmentType",
      header: "Type",
      render: (row: Employee) => (
        <span className="text-xs font-mono font-medium text-muted-foreground uppercase">
          {row.employmentType?.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "joiningDate",
      header: "Joining Date",
      render: (row: Employee) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.joiningDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Employee) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="HR Directory"
          breadcrumbs={[{ label: "Operations" }, { label: "HR Portal", href: "/hr/employees" }, { label: "Employees" }]}
        />
        <Link href="/hr/employees/new" passHref legacyBehavior>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Link New Employee
          </Button>
        </Link>
      </div>

      {/* Filters Board */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 border border-border p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2 font-medium">
          <Filter className="h-4 w-4" />
          Filter:
        </div>

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="text-xs border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
        >
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Design">Design</option>
          <option value="Product">Product</option>
          <option value="Marketing">Marketing</option>
          <option value="Sales">Sales</option>
          <option value="HR">HR</option>
          <option value="Finance">Finance</option>
          <option value="Management">Management</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="RESIGNED">Resigned</option>
          <option value="TERMINATED">Terminated</option>
        </select>

        {(department || status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDepartment("");
              setStatus("");
            }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Employees Table */}
      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        emptyMessage="No employees matched the filters."
        onRowClick={(row) => router.push(`/hr/employees/${row.id}`)}
      />
    </div>
  );
}
