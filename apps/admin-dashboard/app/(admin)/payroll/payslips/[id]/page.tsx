"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { usePayslip, useMarkPayslipPaid } from "@/lib/hooks/usePayroll";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { Printer, Landmark, Wallet, ArrowLeft, Loader2, DollarSign } from "lucide-react";

export default function PayslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: payslip, isLoading, error } = usePayslip(id);
  const markPaid = useMarkPayslipPaid();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("payroll:write");

  const handlePrint = () => {
    window.print();
  };

  const handleMarkAsPaid = () => {
    if (!payslip) return;

    markPaid.mutate(payslip.id, {
      onSuccess: () => {
        toast.success("Payslip successfully marked as Paid!");
      },
      onError: () => {
        toast.error("Failed to mark payslip as paid.");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="p-8 text-center text-rose-500 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100 rounded-xl space-y-3">
        <p className="font-semibold">Error loading payslip details</p>
        <p className="text-xs text-muted-foreground">The requested payslip record is missing or restricted.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const date = new Date(payslip.year, payslip.month - 1);
  const periodStr = date.toLocaleString("default", { month: "long", year: "numeric" });

  const basic = Number(payslip.grossAmount) - Number(payslip.tax) - Number(payslip.deductions) > 0 // let's do a mock or use actual structure
    ? Number(payslip.grossAmount) * 0.6 // Mock breakdown since we only store totals in Payslip model
    : Number(payslip.grossAmount);

  return (
    <div className="space-y-6">
      
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide layout shell */
          aside, header, main > *:not(#printable-payslip), .print-hide {
            display: none !important;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 20px !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Breadcrumb / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print-hide">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title={`Payslip - ${periodStr}`}
            breadcrumbs={[
              { label: "Operations" },
              { label: "Payroll Management", href: "/payroll" },
              { label: "Payslips", href: "/payroll/payslips" },
              { label: payslip.employee?.employeeCode || "Detail" },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
          {payslip.status !== "PAID" && canWrite && (
            <Button size="sm" onClick={handleMarkAsPaid} disabled={markPaid.isPending} className="gap-1.5">
              {markPaid.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Main Payslip Breakdown Card */}
      <Card id="printable-payslip" className="bg-white dark:bg-zinc-900 border border-border shadow-lg p-8 max-w-3xl mx-auto space-y-8 font-sans">
        
        {/* Header Section */}
        <div className="flex justify-between items-start border-b border-border pb-6">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground uppercase">
              Trifusion<span className="text-slate-500 font-normal">Dynamics</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">102-104, Tech Park Sector V, Kolkata, India</p>
            <p className="text-xs text-muted-foreground font-mono">support@trifusiondynamics.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-foreground">PAYSLIP</h2>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Period: {periodStr}</p>
            <div className="mt-2.5">
              <StatusBadge status={payslip.status} />
            </div>
          </div>
        </div>

        {/* Employee & Bank Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-border pb-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee Details</p>
            <p className="font-bold text-foreground text-sm">{payslip.employee?.user?.name}</p>
            <p className="text-muted-foreground"><span className="font-semibold">Designation:</span> {payslip.employee?.designation || "—"}</p>
            <p className="text-muted-foreground"><span className="font-semibold">Department:</span> {payslip.employee?.department || "—"}</p>
            <p className="text-muted-foreground"><span className="font-semibold">Employee Code:</span> <span className="font-mono">{payslip.employee?.employeeCode}</span></p>
          </div>

          <div className="space-y-1.5 text-left md:text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest md:text-right">Payment Details</p>
            <p className="font-semibold text-foreground flex md:justify-end items-center gap-1">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
              Direct Deposit
            </p>
            {payslip.paidAt && (
              <p className="text-muted-foreground">
                <span className="font-semibold">Paid On:</span> {new Date(payslip.paidAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            <p className="text-muted-foreground font-mono text-[10px]">PAYSLIP-ID: {payslip.id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* Salary Breakdown Table */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salary Breakdown</h3>
          
          <div className="border border-border rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-2 bg-slate-50/60 dark:bg-zinc-900/40 border-b border-border font-semibold p-3 text-foreground">
              <div>Description</div>
              <div className="text-right">Amount</div>
            </div>

            <div className="divide-y divide-border text-muted-foreground">
              {/* Gross Earnings */}
              <div className="grid grid-cols-2 p-3 hover:bg-slate-50/30">
                <div className="font-semibold text-foreground">Gross Earnings (Basic + HRA + Allowances)</div>
                <div className="text-right text-foreground font-medium">
                  <MoneyDisplay amount={Number(payslip.grossAmount)} size="sm" />
                </div>
              </div>

              {/* Deductions */}
              <div className="grid grid-cols-2 p-3 hover:bg-slate-50/30">
                <div>Income Tax (TDS @ 5% for &gt;₹25k)</div>
                <div className="text-right text-rose-500 font-medium">
                  - <MoneyDisplay amount={Number(payslip.tax)} size="sm" className="text-rose-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 p-3 hover:bg-slate-50/30">
                <div>Other Deductions (PF, Allowances ded.)</div>
                <div className="text-right text-rose-500 font-medium">
                  - <MoneyDisplay amount={Number(payslip.deductions)} size="sm" className="text-rose-500" />
                </div>
              </div>

              {/* Net Pay */}
              <div className="grid grid-cols-2 p-3 bg-slate-50/40 dark:bg-zinc-900/20 font-bold text-foreground">
                <div className="text-sm">Net Pay (Take Home)</div>
                <div className="text-right text-sm text-emerald-600 dark:text-emerald-400">
                  <MoneyDisplay amount={Number(payslip.netAmount)} size="sm" className="text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="text-center text-[10px] text-muted-foreground pt-6 border-t border-border space-y-1">
          <p className="font-semibold">This is a computer-generated document and requires no physical signature.</p>
          <p>© 2026 Trifusion Dynamics. All rights reserved.</p>
        </div>

      </Card>
    </div>
  );
}
