"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { useRequestLogs, type RequestLog } from "@/lib/hooks/useDeveloper";
import { Button } from "@/components/ui/button";
import { Terminal, Filter, RefreshCw } from "lucide-react";

export default function RequestLogsPage() {
  const [method, setMethod] = React.useState<string>("");
  const [statusClass, setStatusClass] = React.useState<string>("");

  const { data: logs = [], isLoading, refetch } = useRequestLogs({
    method: method || undefined,
  });

  // Client-side status filtering based on class selection
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (!statusClass) return true;
      const code = log.statusCode;
      if (statusClass === "2xx") return code >= 200 && code < 300;
      if (statusClass === "3xx") return code >= 300 && code < 400;
      if (statusClass === "4xx") return code >= 400 && code < 500;
      if (statusClass === "5xx") return code >= 500;
      return true;
    });
  }, [logs, statusClass]);

  const getMethodColor = (m: string) => {
    const norm = m.toUpperCase();
    if (norm === "GET") return "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/50";
    if (norm === "POST") return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50";
    if (norm === "PUT" || norm === "PATCH") return "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/50";
    if (norm === "DELETE") return "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/50";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200/40";
    if (code >= 300 && code < 400) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/10 border-blue-200/40";
    if (code >= 400 && code < 500) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/10 border-amber-200/40";
    return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/10 border-rose-200/40";
  };

  const columns = [
    {
      key: "method",
      header: "Method",
      render: (row: RequestLog) => (
        <span className={`font-mono font-bold text-[10px] px-2 py-0.5 border rounded uppercase ${getMethodColor(row.method)}`}>
          {row.method}
        </span>
      ),
    },
    {
      key: "path",
      header: "API Path Endpoint",
      render: (row: RequestLog) => (
        <span className="font-mono text-xs text-foreground font-semibold break-all">{row.path}</span>
      ),
    },
    {
      key: "statusCode",
      header: "Status",
      render: (row: RequestLog) => (
        <span className={`font-mono font-bold text-xs px-2.5 py-0.5 border rounded-full ${getStatusColor(row.statusCode)}`}>
          {row.statusCode}
        </span>
      ),
    },
    {
      key: "durationMs",
      header: "Response Time",
      render: (row: RequestLog) => (
        <span className="text-xs text-muted-foreground font-mono">{row.durationMs} ms</span>
      ),
    },
    {
      key: "ipAddress",
      header: "Remote IP",
      render: (row: RequestLog) => (
        <span className="text-xs text-muted-foreground font-mono">{row.ipAddress || "localhost"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Timestamp",
      render: (row: RequestLog) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-xs font-sans">
      <div className="flex items-center justify-between">
        <PageHeader
          title="API HTTP Request Logs"
          breadcrumbs={[{ label: "Developer Tools" }, { label: "Observability" }, { label: "Request Logs" }]}
        />
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 h-8">
          <RefreshCw className="h-4 w-4" />
          Refresh Output
        </Button>
      </div>

      {/* Filter Board */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-zinc-900 border border-border p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2 font-medium">
          <Filter className="h-4 w-4" />
          Filter:
        </div>

        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="text-xs border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
        >
          <option value="">All HTTP Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>

        <select
          value={statusClass}
          onChange={(e) => setStatusClass(e.target.value)}
          className="text-xs border border-border bg-card text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
        >
          <option value="">All Status Ranges</option>
          <option value="2xx">Success (2xx)</option>
          <option value="3xx">Redirects (3xx)</option>
          <option value="4xx">Client Errors (4xx)</option>
          <option value="5xx">Server Errors (5xx)</option>
        </select>

        {(method || statusClass) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMethod("");
              setStatusClass("");
            }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Logs Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        isLoading={isLoading}
        emptyMessage="No request logs stored for this filter range."
      />
    </div>
  );
}
