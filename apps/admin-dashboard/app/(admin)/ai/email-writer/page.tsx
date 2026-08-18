"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Loader2, Copy, Inbox, Send, Sparkles, AlertCircle } from "lucide-react";

export default function EmailWriterPage() {
  const [context, setContext] = React.useState("");
  const [tone, setTone] = React.useState("professional");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  const writeEmail = useMutation({
    mutationFn: async (payload: { context: string; tone: string }) => {
      const { data } = await apiClient.post("/ai/email-writer", payload);
      return data as { generatedSubject: string; generatedBody: string };
    },
    onSuccess: (data) => {
      setSubject(data.generatedSubject || "");
      setBody(data.generatedBody || "");
      toast.success("Email generated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to generate email.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) {
      toast.error("Please provide email context.");
      return;
    }
    writeEmail.mutate({ context, tone });
  };

  const handleCopySubject = () => {
    if (!subject) return;
    navigator.clipboard.writeText(subject);
    toast.success("Subject copied!");
  };

  const handleCopyBody = () => {
    if (!body) return;
    navigator.clipboard.writeText(body);
    toast.success("Body copied!");
  };

  const handleCopyAll = () => {
    if (!subject || !body) return;
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    toast.success("Full email copied!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Email Writer"
        breadcrumbs={[{ label: "Technical Assets" }, { label: "AI Workloads" }, { label: "Email Writer" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Configurations Form */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-400" />
                Drafter Options
              </CardTitle>
              <CardDescription>Specify the context and tone for the draft.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Email Context / Objective *</label>
                  <textarea
                    placeholder="Describe what you want to write (e.g., following up with a lead about a proposal, apologizing for a delayed deployment...)"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={6}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Tone of Voice</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="persuasive">Persuasive</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={writeEmail.isPending || !context}
                  className="w-full gap-2 mt-2"
                >
                  {writeEmail.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Drafting Email...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Write Email
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Generated output */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md h-full min-h-[450px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-sm font-bold">Email Draft</CardTitle>
                <CardDescription className="text-xs">Generated subject and body options.</CardDescription>
              </div>

              {subject && body && (
                <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5 h-8">
                  <Copy className="h-3.5 w-3.5" />
                  Copy Full Email
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
              {writeEmail.isPending ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-slate-400">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-semibold animate-pulse">Drafting Subject & Body Paragraphs...</p>
                </div>
              ) : subject || body ? (
                <div className="space-y-4 text-xs font-sans">
                  {/* Subject */}
                  <div className="border border-border rounded-xl bg-slate-50/40 dark:bg-zinc-950/10 p-4 relative group">
                    <button
                      onClick={handleCopySubject}
                      className="absolute right-3 top-3.5 p-1 bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 rounded border border-border transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy Subject"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject Line</p>
                    <p className="font-bold text-foreground text-sm mt-1.5 pr-8">{subject}</p>
                  </div>

                  {/* Body */}
                  <div className="border border-border rounded-xl bg-slate-50/40 dark:bg-zinc-950/10 p-4 relative group flex-1">
                    <button
                      onClick={handleCopyBody}
                      className="absolute right-3 top-3.5 p-1 bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 rounded border border-border transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy Body"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Body</p>
                    <pre className="text-xs text-foreground font-sans mt-3 whitespace-pre-wrap leading-relaxed pr-8">
                      {body}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-xs text-slate-400 gap-2">
                  <Inbox className="h-12 w-12 text-slate-200 dark:text-zinc-800" />
                  <p className="font-medium">No email draft generated yet</p>
                  <p className="text-[11px] text-muted-foreground">Provide instructions on the left and submit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
