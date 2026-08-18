"use client";

import { FolderKanban, Receipt, Ticket, Clock, CheckCircle2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function ClientDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/20 to-zinc-900 border border-purple-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            Client Portal Workspace
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3">Welcome to your Project Hub</h1>
          <p className="mt-2 text-zinc-300 text-sm max-w-2xl">
            Track real-time milestone progress, view open invoices, download deliverables, and raise priority support tickets.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Active Projects</span>
            <FolderKanban className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">2</p>
          <p className="text-xs text-emerald-400 mt-1">Sprint 4 in progress</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Open Tickets</span>
            <Ticket className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">1</p>
          <p className="text-xs text-zinc-400 mt-1">1 High Priority under review</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Pending Invoices</span>
            <Receipt className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">$4,500</p>
          <p className="text-xs text-amber-400 mt-1">Due in 5 days</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">SLA Uptime</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">99.98%</p>
          <p className="text-xs text-emerald-400 mt-1">SLA Target Met</p>
        </div>
      </div>

      {/* Active Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Your Active Projects</h2>
          <Link href="/client/projects" className="text-xs font-semibold text-purple-400 hover:underline flex items-center gap-1">
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                On Schedule
              </span>
              <span className="text-xs text-zinc-400">Deadline: Aug 25, 2026</span>
            </div>
            <h3 className="text-lg font-bold text-white">Triflow SaaS Portal & Mobile App</h3>
            <p className="text-xs text-zinc-400">
              Next.js 15 web application with NestJS auth gateway and React Native mobile release.
            </p>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Milestone Progress</span>
                <span className="font-semibold text-white">75%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full w-[75%]" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold">
                AI Fine-tuning Phase
              </span>
              <span className="text-xs text-zinc-400">Deadline: Sep 10, 2026</span>
            </div>
            <h3 className="text-lg font-bold text-white">Enterprise RAG & Document Pipeline</h3>
            <p className="text-xs text-zinc-400">
              PostgreSQL pgvector database setup with Python FastAPI microservices.
            </p>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Milestone Progress</span>
                <span className="font-semibold text-white">40%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-[40%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
