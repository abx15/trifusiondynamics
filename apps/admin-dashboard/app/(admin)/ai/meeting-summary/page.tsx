"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Loader2, FileText, CheckSquare, Square, User, Calendar, Send, Sparkles } from "lucide-react";

export default function MeetingSummaryPage() {
  const [transcript, setTranscript] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [actionItems, setActionItems] = React.useState<any[]>([]);

  const summarizeMeeting = useMutation({
    mutationFn: async (payload: { transcript: string; meetingTitle?: string }) => {
      const { data } = await apiClient.post("/ai/meeting-summary", payload);
      return data as { summary: string; actionItems: any[] };
    },
    onSuccess: (data) => {
      setSummary(data.summary || "");
      setActionItems(data.actionItems || []);
      toast.success("Meeting summarized successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to summarize meeting.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript) {
      toast.error("Please paste a meeting transcript.");
      return;
    }
    summarizeMeeting.mutate({ transcript, meetingTitle: title || undefined });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Meeting Summary"
        breadcrumbs={[{ label: "Technical Assets" }, { label: "AI Workloads" }, { label: "Meeting Summary" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form panel */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Transcript Input
              </CardTitle>
              <CardDescription>Paste the transcript of your call to extract summary and actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Meeting Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. F5 Frontend Planning Sync"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Paste Transcript *</label>
                  <textarea
                    placeholder="Arun: We need to ship Phase F5 by Monday. Sanjay will handle the Developer portal, and Sanjay will also write the backend. Sanjay: I can get that done. Let's align..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={10}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary font-mono"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={summarizeMeeting.isPending || !transcript}
                  className="w-full gap-2"
                >
                  {summarizeMeeting.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing Transcript...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Summarize Call
                    </>
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md h-full min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Extracted Summary & Actions
              </CardTitle>
              <CardDescription className="text-xs">Summary paragraph and structured checklist below.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-y-auto space-y-6 text-xs">
              
              {summarizeMeeting.isPending ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-slate-400">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-semibold animate-pulse">Running semantic parsing & action item extraction...</p>
                </div>
              ) : summary || actionItems.length > 0 ? (
                <div className="space-y-6 font-sans">
                  
                  {/* Summary Paragraph */}
                  {summary && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Executive Summary</h3>
                      <p className="text-muted-foreground leading-relaxed bg-slate-50/50 dark:bg-zinc-950/20 p-4 border border-border rounded-xl">
                        {summary}
                      </p>
                    </div>
                  )}

                  {/* Action Items Checklist */}
                  {actionItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-slate-400" />
                        Action Items
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        {actionItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-border bg-card hover:bg-slate-50/20 transition-colors gap-3">
                            <div className="flex items-start gap-3">
                              <Square className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-foreground">{item.task}</p>
                                <div className="flex flex-wrap gap-2.5 mt-1.5 text-[10px] text-muted-foreground font-semibold">
                                  {item.assignee && (
                                    <span className="inline-flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {item.assignee}
                                    </span>
                                  )}
                                  {item.dueDate && (
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {item.dueDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-xs text-slate-400 gap-2">
                  <FileText className="h-12 w-12 text-slate-200 dark:text-zinc-800" />
                  <p className="font-medium">No meeting summary loaded yet</p>
                  <p className="text-[11px] text-muted-foreground">Submit a transcript on the left and run analysis.</p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
