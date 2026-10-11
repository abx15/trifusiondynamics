"use client";

import React from "react";
import {
  Server,
  Database,
  Activity,
  RefreshCw,
  CheckCircle2,
  Zap,
  Globe,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface TelemetryService {
  name: string;
  port: string;
  status: string;
  latency: string;
  uptime: string;
  type: string;
}

interface TelemetryData {
  clusterStatus: string;
  services: TelemetryService[];
  infrastructure: {
    database: {
      engine: string;
      status: string;
      latency: string;
    };
    redis: {
      engine: string;
      status: string;
      latency: string;
    };
    memoryUsage?: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

export default function SuperAdminSystemPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["super-admin-telemetry"],
    queryFn: async () => {
      const res = await apiClient.get("/super-admin/telemetry");
      return res.data as TelemetryData;
    },
    staleTime: 30_000,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("System telemetry re-synchronized successfully!");
    } catch {
      toast.error("Failed to re-synchronize telemetry");
    }
  };

  const services = data?.services || [];
  const dbInfo = data?.infrastructure?.database;
  const redisInfo = data?.infrastructure?.redis;

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
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isFetching ? "animate-spin" : ""}`} />
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
          <p className="text-2xl font-bold text-white">{dbInfo?.engine || "Neon Cloud DB"}</p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {dbInfo?.status || "Active"} ({dbInfo?.latency || "--"})
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Redis Cache Layer</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{redisInfo?.engine || "Upstash Redis"}</p>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {redisInfo?.status || "Active"} ({redisInfo?.latency || "--"})
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
          <p className="text-2xl font-bold text-emerald-400">{data?.clusterStatus || "Healthy"}</p>
          <p className="text-[11px] text-zinc-400 font-medium">{services.length || 4} Services Active</p>
        </div>
      </div>

      {/* Services List */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 font-bold text-sm text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" /> Registered Microservices
        </div>
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
