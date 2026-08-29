"use client";

import * as React from "react";
import { Users2, Calendar, ClipboardList, TrendingUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function HrDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-zinc-900 border border-emerald-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            HR Workspace
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3">People Operations Center</h1>
          <p className="mt-2 text-zinc-300 text-sm max-w-2xl">
            Manage employee records, review leave requests, track recruitment pipelines, and maintain a healthy team culture.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Total Employees</span>
            <Users2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">24</p>
          <p className="text-xs text-emerald-400 mt-1">+3 this quarter</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Pending Leaves</span>
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">5</p>
          <p className="text-xs text-amber-400 mt-1">2 urgent reviews</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Open Positions</span>
            <ClipboardList className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">7</p>
          <p className="text-xs text-blue-400 mt-1">4 in interview stage</p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase">Retention Rate</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">94.2%</p>
          <p className="text-xs text-emerald-400 mt-1">Above industry avg</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/hr/employees"
            className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <Users2 className="w-6 h-6 text-emerald-400" />
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-white">Employee Directory</h3>
            <p className="text-xs text-zinc-400 mt-1">View, manage, and link employee profiles.</p>
          </Link>

          <Link
            href="/hr/leaves"
            className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-6 h-6 text-amber-400" />
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-white">Leave Requests</h3>
            <p className="text-xs text-zinc-400 mt-1">Review and approve pending leave applications.</p>
          </Link>

          <Link
            href="/hr/recruitment"
            className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <ClipboardList className="w-6 h-6 text-blue-400" />
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-white">Recruitment Board</h3>
            <p className="text-xs text-zinc-400 mt-1">Track candidates through hiring pipelines.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
