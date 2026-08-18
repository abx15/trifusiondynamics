"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useLeads } from "@/lib/hooks/useLeads";
import { useClients } from "@/lib/hooks/useClients";
import { toast } from "@/lib/toast";
import { Loader2, Copy, FileText, Sparkles, Send } from "lucide-react";

export default function ProposalGeneratorPage() {
  const [requirements, setRequirements] = React.useState("");
  const [leadId, setLeadId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [generatedContent, setGeneratedContent] = React.useState("");

  // Fetch leads and clients for selection
  const { data: leadsData } = useLeads({ limit: 100 });
  const { data: clientsData } = useClients();
  const leads = leadsData?.data || [];
  const clients = clientsData?.data || [];

  // Fetch proposal history
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["ai", "proposals", "history"],
    queryFn: async () => {
      const { data } = await apiClient.get("/ai/proposal-generator/history");
      return data as any[];
    },
  });

  const generateProposal = useMutation({
    mutationFn: async (payload: { requirements: string; leadId?: string; clientId?: string }) => {
      const { data } = await apiClient.post("/ai/proposal-generator", payload);
      return data as { generatedContent: string };
    },
    onSuccess: (data) => {
      setGeneratedContent(data.generatedContent);
      toast.success("Proposal generated successfully!");
      refetchHistory();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to generate proposal.");
    },
  });

  const saveAsDocument = useMutation({
    mutationFn: async (payload: { title: string; content: string; type: string }) => {
      // Calls Phase 6 stubs endpoint /ai/proposal to save
      const { data } = await apiClient.post("/ai/proposal", payload);
      return data;
    },
    onSuccess: () => {
      toast.success("Successfully saved proposal to Document Store!");
    },
    onError: () => {
      toast.error("Failed to save document.");
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirements) {
      toast.error("Please enter project requirements.");
      return;
    }
    generateProposal.mutate({
      requirements,
      leadId: leadId || undefined,
      clientId: clientId || undefined,
    });
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard!");
  };

  const handleSaveDoc = () => {
    if (!generatedContent) return;
    saveAsDocument.mutate({
      title: `AI Proposal - ${new Date().toLocaleDateString()}`,
      content: generatedContent,
      type: "PROPOSAL",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Proposal Generator"
        breadcrumbs={[{ label: "Technical Assets" }, { label: "AI Workloads" }, { label: "Proposal Generator" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Form Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                Configure Inputs
              </CardTitle>
              <CardDescription>Enter instructions and specify a target client/lead.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4 text-xs">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Project Requirements *</label>
                  <textarea
                    placeholder="Describe client requirements, timeline, budget, and scope..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={8}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary font-sans"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Associate with Lead (Optional)</label>
                  <select
                    value={leadId}
                    onChange={(e) => {
                      setLeadId(e.target.value);
                      if (e.target.value) setClientId("");
                    }}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">None</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.company ? `(${l.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Associate with Client (Optional)</label>
                  <select
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      if (e.target.value) setLeadId("");
                    }}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">None</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={generateProposal.isPending || !requirements}
                  className="w-full gap-2 mt-2"
                >
                  {generateProposal.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Proposal...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Draft Proposal
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>

          {/* Proposal Generation History */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Draft History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-3">
              {history.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setGeneratedContent(h.generatedContent)}
                      className="p-2.5 bg-slate-50 dark:bg-zinc-800/40 rounded border border-border hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <p className="font-semibold text-foreground truncate">{h.requirements}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Generated: {new Date(h.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 italic">
                  No proposal generation history.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Output Panel Column */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md h-full min-h-[500px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-sm font-bold">Proposal Output</CardTitle>
                <CardDescription className="text-xs">Copy or save generated content below.</CardDescription>
              </div>
              
              {generatedContent && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 h-8">
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSaveDoc} disabled={saveAsDocument.isPending} className="gap-1.5 h-8">
                    {saveAsDocument.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Save as Document
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-y-auto">
              {generateProposal.isPending ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-slate-400">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-semibold animate-pulse">Analyzing requirements & drafting proposal...</p>
                  <p className="text-xs text-muted-foreground">This may take up to 15 seconds. Please do not close this window.</p>
                </div>
              ) : generatedContent ? (
                <pre className="text-xs text-foreground font-mono bg-slate-50/50 dark:bg-zinc-950/20 p-4 border border-border rounded-xl whitespace-pre-wrap leading-relaxed h-full">
                  {generatedContent}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-xs text-slate-400 gap-2">
                  <FileText className="h-12 w-12 text-slate-200 dark:text-zinc-800" />
                  <p className="font-medium">No proposal generated yet</p>
                  <p className="text-[11px] text-muted-foreground">Fill in project requirements on the left and submit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
