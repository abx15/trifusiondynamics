"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useEmployees, type Employee } from "@/lib/hooks/useHR";
import { useSaveSalaryStructure, useGeneratePayslipsBulk } from "@/lib/hooks/usePayroll";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DollarSign, Plus, Settings, Play, Loader2, Landmark } from "lucide-react";
import Link from "next/link";

export default function PayrollDashboardPage() {
  const { data: employees = [], isLoading, refetch: refetchEmployees } = useEmployees();
  const saveSalary = useSaveSalaryStructure();
  const generatePayslips = useGeneratePayslipsBulk();

  // Salary Structure Modal states
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isSalaryOpen, setIsSalaryOpen] = React.useState(false);
  const [basicSalary, setBasicSalary] = React.useState<number>(0);
  const [hra, setHra] = React.useState<number>(0);
  const [allowances, setAllowances] = React.useState<number>(0);
  const [deductions, setDeductions] = React.useState<number>(0);

  // Bulk Generator states
  const [isBulkOpen, setIsBulkOpen] = React.useState(false);
  const [month, setMonth] = React.useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = React.useState<number>(new Date().getFullYear());

  const handleOpenSalary = (emp: Employee) => {
    setSelectedEmployee(emp);
    // If they already have a salary structure (but we only fetched ID, so let's load or set defaults)
    // Wait, let's look up if we can fetch it, or just default to 0. Since we have a backend GET salary-structure/:id endpoint, we can fetch it!
    // But to keep it simple, we can fetch it via api-client directly when opening:
    setIsSalaryOpen(true);
    setBasicSalary(0);
    setHra(0);
    setAllowances(0);
    setDeductions(0);

    import("@/lib/api-client").then(async ({ apiClient }) => {
      try {
        const { data } = await apiClient.get(`/payroll/salary-structure/${emp.id}`);
        if (data) {
          setBasicSalary(Number(data.basicSalary));
          setHra(Number(data.hra));
          setAllowances(Number(data.allowances));
          setDeductions(Number(data.deductions));
        }
      } catch (e) {
        // Not configured yet, default to 0
      }
    });
  };

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    saveSalary.mutate(
      {
        employeeId: selectedEmployee.id,
        basicSalary,
        hra,
        allowances,
        deductions,
      },
      {
        onSuccess: () => {
          toast.success(`Updated salary structure for ${selectedEmployee.user?.name}`);
          setIsSalaryOpen(false);
          refetchEmployees();
        },
        onError: () => {
          toast.error("Failed to update salary structure.");
        },
      }
    );
  };

  const handleGenerateBulk = (e: React.FormEvent) => {
    e.preventDefault();

    generatePayslips.mutate(
      { month, year },
      {
        onSuccess: (data) => {
          toast.success(
            `Payslip run completed! Generated: ${data.generated}, Skipped/Existing: ${data.skipped}`
          );
          setIsBulkOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || "Failed to generate payslips bulk.");
        },
      }
    );
  };

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
      key: "department",
      header: "Department",
      render: (row: Employee) => (
        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-foreground">
          {row.department || "—"}
        </span>
      ),
    },
    {
      key: "salaryStatus",
      header: "Salary Structure",
      render: (row: Employee) => {
        const isSet = !!row.salaryStructure;
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              isSet ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
            }`}
          >
            {isSet ? "Configured" : "Not Configured"}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row: Employee) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenSalary(row)} className="gap-1.5 h-8">
            <Settings className="h-3.5 w-3.5" />
            Set Salary
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Payroll Hub"
          breadcrumbs={[{ label: "Operations" }, { label: "Payroll Management" }]}
        />
        <div className="flex items-center gap-3">
          <Link href="/payroll/payslips" passHref legacyBehavior>
            <Button variant="outline" size="sm" className="gap-2">
              <Landmark className="h-4 w-4" />
              View Payslips History
            </Button>
          </Link>
          <Button size="sm" onClick={() => setIsBulkOpen(true)} className="gap-2">
            <Play className="h-4 w-4" />
            Generate Payslips
          </Button>
        </div>
      </div>

      {/* Employees Salary structures DataTable */}
      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        emptyMessage="No employees found. Add employees in the HR Portal first."
      />

      {/* Salary Structure configuration Sheet */}
      <Sheet open={isSalaryOpen} onOpenChange={setIsSalaryOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md bg-card">
          <SheetHeader>
            <SheetTitle>Configure Salary Structure</SheetTitle>
            <SheetDescription>
              Set up or update basic salary, HRA, allowances, and deductions for {selectedEmployee?.user?.name}.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSaveSalary} className="space-y-4 mt-6 text-xs">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Basic Salary (Monthly) *</label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={basicSalary || ""}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">HRA (House Rent Allowance)</label>
              <Input
                type="number"
                placeholder="e.g. 20000"
                value={hra || ""}
                onChange={(e) => setHra(Number(e.target.value))}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Other Allowances</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={allowances || ""}
                onChange={(e) => setAllowances(Number(e.target.value))}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Deductions (PF, Professional Tax)</label>
              <Input
                type="number"
                placeholder="e.g. 3000"
                value={deductions || ""}
                onChange={(e) => setDeductions(Number(e.target.value))}
                className="text-xs"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSalaryOpen(false)}
                disabled={saveSalary.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveSalary.isPending}
                className="gap-2"
              >
                {saveSalary.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Structure
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Bulk Payslip generation Sheet */}
      <Sheet open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md bg-card">
          <SheetHeader>
            <SheetTitle>Generate Payslips Run</SheetTitle>
            <SheetDescription>
              Select the payroll period to run a bulk generator for all active employees with configured salary structures.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleGenerateBulk} className="space-y-4 mt-6 text-xs">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Select Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
              >
                {Array.from({ length: 12 }).map((_, idx) => {
                  const m = idx + 1;
                  const date = new Date(2000, idx);
                  return (
                    <option key={m} value={m}>
                      {date.toLocaleString("default", { month: "long" })}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Select Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBulkOpen(false)}
                disabled={generatePayslips.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={generatePayslips.isPending}
                className="gap-2"
              >
                {generatePayslips.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Run Payroll Generator
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
