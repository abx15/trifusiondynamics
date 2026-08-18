"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateWorkflow } from "@/lib/hooks/useAutomation";
import { toast } from "@/lib/toast";
import { Plus, Trash, HelpCircle, Save, ArrowLeft, Loader2, Play } from "lucide-react";

interface ActionStepInput {
  type: "WEBHOOK" | "EMAIL" | "LOG";
  url?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function NewWorkflowBuilderPage() {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();

  // Basic Info
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  // Trigger Details
  const [triggerType, setTriggerType] = React.useState<"CRON" | "WEBHOOK" | "EVENT">("CRON");
  const [cronExpression, setCronExpression] = React.useState("*/5 * * * *");
  const [eventTrigger, setEventTrigger] = React.useState("lead.created");

  // Step Action Builder
  const [steps, setSteps] = React.useState<ActionStepInput[]>([
    { type: "LOG", message: "Workflow triggered successfully." }
  ]);

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { type: "LOG", message: "Add log message here." }]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, fields: Partial<ActionStepInput>) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...fields } : step))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide a name for the workflow.");
      return;
    }

    // Format steps for backend WorkflowStep representation
    const formattedSteps = steps.map((s, idx) => {
      let config: any = {};
      if (s.type === "WEBHOOK") {
        config = { url: s.url || "" };
      } else if (s.type === "EMAIL") {
        config = { email: s.email || "", subject: s.subject || "", message: s.message || "" };
      } else if (s.type === "LOG") {
        config = { message: s.message || "" };
      }

      return {
        type: s.type,
        sequence: idx + 1,
        config,
      };
    });

    // Format trigger config
    const triggerConfig =
      triggerType === "CRON"
        ? { expression: cronExpression }
        : triggerType === "EVENT"
        ? { event: eventTrigger }
        : {};

    createWorkflow.mutate(
      {
        name,
        description: description || undefined,
        triggerType,
        triggerConfig,
        steps: formattedSteps as any,
      },
      {
        onSuccess: () => {
          toast.success("Workflow created successfully!");
          router.push("/automation");
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || "Failed to build workflow.");
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/automation")} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Build Automation Workflow"
          breadcrumbs={[
            { label: "Technical Assets" },
            { label: "Automations", href: "/automation" },
            { label: "New Builder" },
          ]}
        />
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-sans">
        
        {/* Left Columns: Config & Trigger */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Card */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>Give your automation pipeline a descriptive identifier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Workflow Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Lead Follow-up Dispatcher"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="What does this pipeline trigger? (e.g. Automatically send email when lead is created)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Step Builder Card */}
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div>
                <CardTitle>Action Pipeline</CardTitle>
                <CardDescription>Configure sequence of execution nodes when trigger fires.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddStep} className="gap-1.5 h-8">
                <Plus className="h-4 w-4" />
                Add Action Node
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic border border-dashed border-border rounded-xl">
                  No action steps configured. Add at least one node.
                </div>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="border border-border bg-slate-50/50 dark:bg-zinc-800/10 rounded-xl p-4 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(index)}
                        className="absolute right-3 top-3.5 p-1 bg-card hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded border border-border transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Step"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>

                      <div className="flex items-center gap-3">
                        <span className="h-5 w-5 bg-primary text-primary-foreground font-mono font-bold flex items-center justify-center rounded-full text-[10px]">
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Node Type:</label>
                          <select
                            value={step.type}
                            onChange={(e) => handleStepChange(index, { type: e.target.value as any })}
                            className="text-xs border border-border bg-card text-foreground rounded px-2.5 py-1 outline-none font-semibold focus:ring-1 focus:ring-primary"
                          >
                            <option value="LOG">Log Message</option>
                            <option value="WEBHOOK">Webhook Callback</option>
                            <option value="EMAIL">Email Alert</option>
                          </select>
                        </div>
                      </div>

                      {/* Step Specific Details Form */}
                      {step.type === "LOG" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Log Context</label>
                          <Input
                            type="text"
                            placeholder="Message to write to runner output logs..."
                            value={step.message || ""}
                            onChange={(e) => handleStepChange(index, { message: e.target.value })}
                            className="text-xs"
                          />
                        </div>
                      )}

                      {step.type === "WEBHOOK" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Callback HTTP Endpoint URL</label>
                          <Input
                            type="url"
                            placeholder="https://api.yourservice.com/webhook-listener"
                            value={step.url || ""}
                            onChange={(e) => handleStepChange(index, { url: e.target.value })}
                            className="text-xs font-mono"
                          />
                        </div>
                      )}

                      {step.type === "EMAIL" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient Email</label>
                            <Input
                              type="email"
                              placeholder="e.g. notifications@company.com"
                              value={step.email || ""}
                              onChange={(e) => handleStepChange(index, { email: e.target.value })}
                              className="text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Subject</label>
                            <Input
                              type="text"
                              placeholder="e.g. Pipeline Dispatch Triggered"
                              value={step.subject || ""}
                              onChange={(e) => handleStepChange(index, { subject: e.target.value })}
                              className="text-xs"
                            />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Content Message</label>
                            <textarea
                              placeholder="Dear Sanjay, the pipeline executed successfully..."
                              value={step.message || ""}
                              onChange={(e) => handleStepChange(index, { message: e.target.value })}
                              rows={2}
                              className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Trigger Selector & Cron Guide */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle>Trigger Node</CardTitle>
              <CardDescription>Select event mechanism that fires this workflow run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Trigger Type</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}
                  className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CRON">Cron (Scheduled Job)</option>
                  <option value="WEBHOOK">Webhook (Incoming POST)</option>
                  <option value="EVENT">Event Dispatcher</option>
                </select>
              </div>

              {triggerType === "CRON" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Cron Expression</label>
                  <Input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    className="text-xs font-mono font-bold"
                    placeholder="*/5 * * * *"
                  />
                </div>
              )}

              {triggerType === "EVENT" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Event Name</label>
                  <select
                    value={eventTrigger}
                    onChange={(e) => setEventTrigger(e.target.value)}
                    className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary font-mono"
                  >
                    <option value="lead.created">lead.created</option>
                    <option value="client.added">client.added</option>
                    <option value="invoice.paid">invoice.paid</option>
                    <option value="task.completed">task.completed</option>
                  </select>
                </div>
              )}

              {triggerType === "WEBHOOK" && (
                <div className="p-3 border border-dashed border-border rounded-lg bg-slate-50/50 dark:bg-zinc-800/20 text-muted-foreground text-[11px] leading-relaxed">
                  Incoming webhook listener url will be generated automatically once workflow is saved. Submit a POST request to trigger.
                </div>
              )}
            </CardContent>
          </Card>

          {/* CRON Syntax Guidelines Panel */}
          {triggerType === "CRON" && (
            <Card className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4" />
                  CRON Reference Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-amber-600 dark:text-amber-400/90 leading-relaxed font-mono space-y-2">
                <p className="font-bold underline">Format: min hour day-of-month month day-of-week</p>
                <div className="space-y-1 bg-white/70 dark:bg-zinc-950/20 p-2.5 rounded border border-amber-200/50">
                  <p>• <span className="font-bold">*/5 * * * *</span> : Every 5 minutes</p>
                  <p>• <span className="font-bold">0 * * * *</span> : Hourly (at minute 0)</p>
                  <p>• <span className="font-bold">0 0 * * *</span> : Daily at midnight</p>
                  <p>• <span className="font-bold">0 9 * * 1-5</span> : 9 AM Mon-Fri</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={createWorkflow.isPending || !name.trim() || steps.length === 0}
              className="w-full gap-2"
            >
              {createWorkflow.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Workflow
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
