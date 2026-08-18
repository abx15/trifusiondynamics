"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useWebhooks, useCreateWebhook, useToggleWebhook, useDeleteWebhook, useWebhookDeliveries, type Webhook, type WebhookDelivery } from "@/lib/hooks/useDeveloper";
import { toast } from "@/lib/toast";
import { Plus, Trash2, ToggleLeft, ToggleRight, Radio, History, Loader2, ArrowLeft, Send } from "lucide-react";

const WEBHOOK_EVENTS = [
  { label: "Lead Created", value: "lead.created" },
  { label: "Lead Converted", value: "lead.converted" },
  { label: "Invoice Created", value: "invoice.created" },
  { label: "Invoice Paid", value: "invoice.paid" },
  { label: "Employee Created", value: "employee.created" },
  { label: "Leave Approved", value: "leave.approved" },
];

export default function WebhooksPage() {
  const { data: webhooks = [], isLoading, refetch } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();

  // Selected Webhook for Deliveries History
  const [selectedWebhook, setSelectedWebhook] = React.useState<Webhook | null>(null);
  
  // Deliveries Hook (called conditionally if selectedWebhook is non-null)
  const { data: deliveries = [], isLoading: isLoadingDeliveries, refetch: refetchDeliveries } =
    useWebhookDeliveries(selectedWebhook?.id || "");

  // Modal / Form state
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([]);

  // Delete Confirm Dialog state
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const handleEventToggle = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please provide a webhook listener URL.");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error("Please select at least one event subscription.");
      return;
    }

    createWebhook.mutate(
      { url, events: selectedEvents },
      {
        onSuccess: () => {
          toast.success("Webhook endpoint added successfully!");
          setIsAddOpen(false);
          setUrl("");
          setSelectedEvents([]);
          refetch();
        },
        onError: () => {
          toast.error("Failed to configure webhook endpoint.");
        },
      }
    );
  };

  const handleToggleActive = (e: React.MouseEvent, wh: Webhook) => {
    e.stopPropagation();
    toggleWebhook.mutate(
      { id: wh.id, isActive: !wh.isActive },
      {
        onSuccess: (data) => {
          toast.success(`Webhook endpoint is now ${data.isActive ? "Active" : "Inactive"}`);
          refetch();
        },
        onError: () => {
          toast.error("Failed to toggle webhook endpoint.");
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    deleteWebhook.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Webhook endpoint deleted successfully.");
        setDeleteTargetId(null);
        if (selectedWebhook?.id === deleteTargetId) {
          setSelectedWebhook(null);
        }
        refetch();
      },
      onError: () => {
        toast.error("Failed to delete webhook.");
      },
    });
  };

  const webhookColumns = [
    {
      key: "url",
      header: "Endpoint URL",
      render: (row: Webhook) => (
        <span className="font-mono text-xs text-foreground font-semibold break-all">{row.url}</span>
      ),
    },
    {
      key: "events",
      header: "Event Subscriptions",
      render: (row: Webhook) => (
        <div className="flex flex-wrap gap-1">
          {row.events.map((ev) => (
            <span key={ev} className="text-[9px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-foreground px-1.5 py-0.5 rounded">
              {ev}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Active",
      className: "text-center",
      render: (row: Webhook) => (
        <button
          onClick={(e) => handleToggleActive(e, row)}
          disabled={toggleWebhook.isPending}
          className="text-primary hover:scale-105 transition-transform cursor-pointer disabled:opacity-50"
        >
          {row.isActive ? (
            <ToggleRight className="h-7 w-7 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-7 w-7 text-slate-400" />
          )}
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row: Webhook) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTargetId(row.id);
          }}
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 p-1.5 h-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-xs font-sans">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Webhook Subscriptions"
          breadcrumbs={[{ label: "Developer Tools" }, { label: "Integrations" }, { label: "Webhooks" }]}
        />
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Endpoints List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Radio className="h-4 w-4 text-slate-400" />
                Endpoints Directory
              </CardTitle>
              <CardDescription>Select any configured endpoint to view its deliverability log history.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <DataTable
                columns={webhookColumns}
                data={webhooks}
                isLoading={isLoading}
                emptyMessage="No webhooks configured yet."
                onRowClick={(row) => setSelectedWebhook(row)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Deliveries Logs */}
        <div className="lg:col-span-1">
          <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md h-full min-h-[450px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" />
                  Deliveries Log
                </CardTitle>
                <CardDescription className="text-xs">Select a webhook to view HTTP delivery logs.</CardDescription>
              </div>
              {selectedWebhook && (
                <Button variant="ghost" size="sm" onClick={() => refetchDeliveries()} className="h-7 w-7 p-0">
                  <Loader2 className={`h-4 w-4 ${isLoadingDeliveries ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto space-y-3">
              {selectedWebhook ? (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-border space-y-1 bg-card">
                    <p className="font-bold text-foreground truncate">{selectedWebhook.url}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">ENDPOINT-ID: {selectedWebhook.id}</p>
                  </div>

                  {isLoadingDeliveries ? (
                    <div className="py-8 text-center text-slate-400">Loading HTTP deliveries...</div>
                  ) : deliveries.length > 0 ? (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {deliveries.map((d) => (
                        <div key={d.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                          <div className="flex items-center justify-between font-mono text-[9px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold bg-slate-100 px-1 py-0.5 rounded text-foreground font-sans">POST</span>
                              <span className={`font-extrabold px-1 py-0.5 rounded ${
                                d.statusCode >= 200 && d.statusCode < 300
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-rose-50 text-rose-600"
                              }`}>
                                {d.statusCode}
                              </span>
                            </div>
                            <span className="text-slate-400">{d.durationMs}ms</span>
                          </div>
                          
                          <div className="text-[10px] text-muted-foreground font-mono leading-relaxed space-y-1">
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Payload dispatched:</p>
                            <pre className="p-2 bg-slate-50/60 dark:bg-zinc-950/20 border border-border/70 rounded whitespace-pre-wrap truncate max-h-20">
                              {d.payload || "—"}
                            </pre>
                            {d.response && (
                              <>
                                <p className="text-slate-400 font-bold uppercase text-[9px] mt-1.5">Listener response:</p>
                                <pre className="p-2 bg-slate-50/60 dark:bg-zinc-950/20 border border-border/70 rounded whitespace-pre-wrap truncate max-h-20">
                                  {d.response}
                                </pre>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 italic">No delivery events tracked yet.</div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 gap-2">
                  <Send className="h-12 w-12 text-slate-200 dark:text-zinc-800" />
                  <p className="font-semibold">No endpoint selected</p>
                  <p className="text-xs text-muted-foreground">Select an endpoint URL on the left directory list.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Add Webhook Sheet */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md bg-card">
          <SheetHeader>
            <SheetTitle>Add Webhook Listener</SheetTitle>
            <SheetDescription>Configure a destination endpoint to receive real-time JSON events from Trifusion.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAddWebhook} className="space-y-4 mt-6 text-xs">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Payload Destination URL *</label>
              <Input
                type="url"
                placeholder="https://api.yourdomain.com/webhooks/incoming"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Event Triggers Subscription *</label>
              <div className="grid grid-cols-1 gap-2 border border-border bg-card p-3 rounded-lg max-h-48 overflow-y-auto">
                {WEBHOOK_EVENTS.map((ev) => {
                  const isChecked = selectedEvents.includes(ev.value);
                  return (
                    <div
                      key={ev.value}
                      onClick={() => handleEventToggle(ev.value)}
                      className={`flex items-center gap-2.5 p-2 rounded cursor-pointer border hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${
                        isChecked ? "bg-slate-100/70 dark:bg-zinc-800/80 border-primary" : "border-border"
                      }`}
                    >
                      <input type="checkbox" checked={isChecked} readOnly className="pointer-events-none rounded border-gray-300" />
                      <span className="font-semibold text-foreground">{ev.label}</span>
                      <span className="font-mono text-[9px] text-muted-foreground ml-auto">({ev.value})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} disabled={createWebhook.isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createWebhook.isPending || !url.trim() || selectedEvents.length === 0} className="gap-2">
                {createWebhook.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Endpoint URL
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteWebhook.isPending}
        title="Delete Webhook"
        description="Are you sure you want to delete this webhook subscription endpoint? You will no longer receive any real-time JSON event payloads to this URL."
        confirmLabel="Delete Webhook"
        destructive={true}
      />
    </div>
  );
}
