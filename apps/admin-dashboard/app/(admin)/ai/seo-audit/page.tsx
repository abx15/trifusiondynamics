"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Loader2, Globe, CheckCircle2, AlertTriangle, Lightbulb, Send, History, Sparkles } from "lucide-react";

export default function SeoAuditPage() {
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [auditResult, setAuditResult] = React.useState<any>(null);

  // Fetch SEO Audit history
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["ai", "seo", "history"],
    queryFn: async () => {
      const { data } = await apiClient.get("/ai/seo-audit/history");
      return data as any[];
    },
  });

  const auditWebsite = useMutation({
    mutationFn: async (url: string) => {
      const { data } = await apiClient.post("/ai/seo-audit", { websiteUrl: url });
      return data;
    },
    onSuccess: (data) => {
      setAuditResult(data);
      toast.success("SEO Audit completed successfully!");
      refetchHistory();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to audit website.");
    },
  });

  const handleAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl) {
      toast.error("Please enter a website URL.");
      return;
    }
    auditWebsite.mutate(websiteUrl);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
    if (score >= 70) return "text-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-950/20";
    return "text-rose-500 border-rose-500 bg-rose-50 dark:bg-rose-950/20";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI SEO Audit Portal"
        breadcrumbs={[{ label: "Technical Assets" }, { label: "AI Workloads" }, { label: "SEO Audit" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* URL Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-400" />
                Audit Config
              </CardTitle>
              <CardDescription>Submit any site URL to run a live AI SEO diagnostics report.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAudit} className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Website URL *</label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={auditWebsite.isPending || !websiteUrl}
                  className="w-full gap-2"
                >
                  {auditWebsite.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing SEO Elements...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Analyze Website
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* SEO Audit History */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              {history.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setAuditResult(h)}
                      className="p-2.5 bg-slate-50 dark:bg-zinc-800/40 rounded border border-border hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{h.websiteUrl}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {h.score !== null && (
                        <span className={`ml-2 text-xs font-bold px-2 py-0.5 border rounded-full ${
                          h.score >= 90 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : h.score >= 70 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-rose-50 text-rose-600 border-rose-200"
                        }`}>
                          {h.score}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 italic">
                  No SEO audit logs recorded.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit Results Board */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md h-full min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold">Diagnostics Report</CardTitle>
              <CardDescription className="text-xs">Live SEO Score and issue breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-y-auto">
              {auditWebsite.isPending ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-slate-400">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-semibold animate-pulse">Running Page Audits & Analyzing Headings...</p>
                  <p className="text-xs text-muted-foreground">Generating diagnostic recommendations...</p>
                </div>
              ) : auditResult ? (
                <div className="space-y-6 text-xs">
                  
                  {/* Score Gauge */}
                  <div className="flex flex-col items-center justify-center p-6 border border-border rounded-xl bg-slate-50/40 dark:bg-zinc-950/10">
                    <div className={`h-24 w-24 rounded-full border-4 flex flex-col items-center justify-center font-sans ${getScoreColor(auditResult.score)}`}>
                      <span className="text-3xl font-extrabold">{auditResult.score}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Score</span>
                    </div>
                    <p className="text-xs font-semibold mt-4 text-foreground text-center">
                      SEO Performance for <span className="font-mono text-primary underline">{auditResult.websiteUrl}</span>
                    </p>
                  </div>

                  {/* Findings */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Issues Found
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {Array.isArray(auditResult.findings) ? (
                        auditResult.findings.map((f: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-card">
                            <CheckCircle2 className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground leading-relaxed">
                              {typeof f === 'string' ? f : JSON.stringify(f)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <pre className="p-3 bg-slate-50 border border-border rounded-lg whitespace-pre-wrap leading-relaxed font-mono">
                          {JSON.stringify(auditResult.findings, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-emerald-500" />
                      Recommendations
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {Array.isArray(auditResult.recommendations) ? (
                        auditResult.recommendations.map((r: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/20 dark:bg-emerald-950/5">
                            <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-foreground leading-relaxed font-medium">
                              {typeof r === 'string' ? r : JSON.stringify(r)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <pre className="p-3 bg-slate-50 border border-border rounded-lg whitespace-pre-wrap leading-relaxed font-mono">
                          {JSON.stringify(auditResult.recommendations, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-xs text-slate-400 gap-2">
                  <Globe className="h-12 w-12 text-slate-200 dark:text-zinc-800" />
                  <p className="font-medium">No audit run completed yet</p>
                  <p className="text-[11px] text-muted-foreground">Enter a website URL on the left and submit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
