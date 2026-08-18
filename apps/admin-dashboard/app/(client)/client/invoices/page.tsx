"use client";

import { Receipt, Download, CreditCard, CheckCircle2 } from "lucide-react";

export default function ClientInvoicesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-purple-400" /> Invoices & Billing
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          View milestone billing history, download PDF invoices, and process secure payments.
        </p>
      </div>

      <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold uppercase">
            <tr>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Description</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            <tr>
              <td className="p-4 font-mono font-bold text-purple-400">INV-2026-081</td>
              <td className="p-4 text-white font-medium">Sprint 2 Milestone: Multi-Portal & Tickets</td>
              <td className="p-4 font-bold text-white">$4,500.00</td>
              <td className="p-4">Aug 07, 2026</td>
              <td className="p-4">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase">
                  Pending
                </span>
              </td>
              <td className="p-4 text-right space-x-2">
                <button className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 ml-auto">
                  <CreditCard className="w-3.5 h-3.5" /> Pay Now
                </button>
              </td>
            </tr>

            <tr>
              <td className="p-4 font-mono font-bold text-purple-400">INV-2026-042</td>
              <td className="p-4 text-white font-medium">Sprint 1 Milestone: Architecture & Core Auth</td>
              <td className="p-4 font-bold text-white">$3,500.00</td>
              <td className="p-4">Jul 15, 2026</td>
              <td className="p-4">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                  Paid
                </span>
              </td>
              <td className="p-4 text-right">
                <button className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold flex items-center gap-1.5 ml-auto">
                  <Download className="w-3.5 h-3.5" /> Receipt PDF
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
