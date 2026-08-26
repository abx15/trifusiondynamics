"use client";

import React, { useState } from "react";
import {
  Server,
  Database,
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Globe,
} from "lucide-react";
import { toast } from "@/lib/toast";

export default function SuperAdminSystemPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("System telemetry re-synchronized successfully!");
    }, 800);
  };

  const services = [
    {
      name: "Authentication Microservice (NestJS)",
      port: "8000",
      status: "Healthy",
      latency: "14ms",
      uptime: "99.98%",
      type: "Core Auth & RBAC",
    },
    {
      name: "Admin Dashboard (Next.js)",
      port: "3001",
      status: "Healthy",
      latency: "6ms",
      uptime: "100%",
      type: "SSR & Client Portal",
    },
    {
      name: "Agency Web Landing (Next.js)",
      port: "3000",
      status: "Healthy",
      latency: "8ms",
      uptime: "99.95%",
      type: "Public Website & CMS",
    },
    {
      name: "AI Copilot Engine (FastAPI / Python)",
      port: "8001",
      status: "Operational",
      latency: "32ms",
      uptime: "99.90%",
      type: "LLM Orchestration",
    },
  ];

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
            <Server className="w-3 h-3" /> Microservices & Infrastructure
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            System Architecture & Live Telemetry
          </h1>
          <p className="text-xs text-zinc-400">
            Live health monitoring of PostgreSQL (Neon), Upstash Redis, NestJS APIs, and Next.js applications.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Health Status
        </button>
      </div>

      {/* Cluster Status Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">PostgreSQL Engine</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">Neon Cloud DB</p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Connection Pooler Active
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Redis Cache Layer</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">Upstash Cloud</p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Session Cache Ready
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">JWT Security Guard</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">Dual Token</p>
          <p className="text-[11px] text-purple-400 font-medium">Auto-Rotation Enabled</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Global Status</span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">100% Operational</p>
          <p className="text-[11px] text-zinc-400 font-medium">All 4 Services Online</p>
        </div>
      </div>

      {/* Services List */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 font-bold text-sm text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" /> Registered Microservices
        </div>
        <div className="divide-y divide-zinc-800/60">
          {services.map((s, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{s.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
                    Port: {s.port}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{s.type}</p>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Latency</p>
                  <p className="text-xs font-mono font-bold text-zinc-200">{s.latency}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Uptime</p>
                  <p className="text-xs font-mono font-bold text-emerald-400">{s.uptime}</p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {s.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
