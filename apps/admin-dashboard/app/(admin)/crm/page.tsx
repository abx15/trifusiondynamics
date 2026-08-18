"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, User2, TrendingUp } from "lucide-react";
import { useLeads, useUpdateLeadStage, type Lead } from "@/lib/hooks/useLeads";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { toast } from "@/lib/toast";

const STAGES: Lead["stage"][] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const STAGE_COLORS: Record<string, string> = {
  NEW: "border-t-blue-500",
  CONTACTED: "border-t-purple-500",
  QUALIFIED: "border-t-cyan-500",
  PROPOSAL: "border-t-yellow-500",
  NEGOTIATION: "border-t-orange-500",
  WON: "border-t-green-500",
  LOST: "border-t-red-500",
};

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/crm/leads/${lead.id}`}
          className="flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {lead.name}
          </p>
          {lead.company && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.company}</p>
          )}
        </Link>
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {lead.value ? (
          <MoneyDisplay amount={lead.value} size="sm" className="text-foreground" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        {lead.source && (
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-muted-foreground px-1.5 py-0.5 rounded font-medium">
            {lead.source}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
}: {
  stage: Lead["stage"];
  leads: Lead[];
}) {
  return (
    <div
      className={`flex flex-col w-72 shrink-0 rounded-xl border border-border border-t-4 ${STAGE_COLORS[stage]} bg-slate-50/60 dark:bg-zinc-900/40`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <StatusBadge status={stage} size="sm" />
          <span className="text-xs text-muted-foreground font-medium">
            {leads.length}
          </span>
        </div>
        <Link
          href={`/crm/leads/new?stage=${stage}`}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Cards */}
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
          {leads.length === 0 && (
            <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-border">
              <p className="text-xs text-muted-foreground">Drop here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function CRMPage() {
  const { data, isLoading } = useLeads({ limit: 200 });
  const updateStage = useUpdateLeadStage();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [optimisticLeads, setOptimisticLeads] = React.useState<Lead[] | null>(null);

  const allLeads = optimisticLeads ?? data?.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const groupedLeads = React.useMemo(() => {
    const map: Record<string, Lead[]> = {};
    STAGES.forEach((s) => (map[s] = []));
    allLeads.forEach((lead) => {
      if (map[lead.stage]) map[lead.stage].push(lead);
    });
    return map;
  }, [allLeads]);

  const activeCard = React.useMemo(
    () => allLeads.find((l) => l.id === activeId) ?? null,
    [allLeads, activeId]
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    // Determine target stage — overId can be a stage string or a lead id
    const targetStage = STAGES.includes(overId as Lead["stage"])
      ? (overId as Lead["stage"])
      : allLeads.find((l) => l.id === overId)?.stage;

    if (!targetStage) return;

    const dragged = allLeads.find((l) => l.id === draggedId);
    if (!dragged || dragged.stage === targetStage) return;

    // Optimistic update
    const snapshot = [...allLeads];
    setOptimisticLeads(
      allLeads.map((l) => (l.id === draggedId ? { ...l, stage: targetStage } : l))
    );

    updateStage.mutate(
      { id: draggedId, stage: targetStage },
      {
        onError: () => {
          setOptimisticLeads(snapshot);
          toast.error("Failed to update lead stage.");
        },
        onSuccess: () => {
          setOptimisticLeads(null);
        },
      }
    );
  }

  const totalValue = allLeads.reduce((s, l) => s + (l.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">CRM Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} leads ·{" "}
            <MoneyDisplay amount={totalValue} size="sm" className="text-muted-foreground" /> pipeline value
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/leads-inbox"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            Leads Inbox
          </Link>
          <Link
            href="/crm/leads/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <div
              key={s}
              className="w-72 shrink-0 h-64 rounded-xl border border-border bg-slate-100 dark:bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                leads={groupedLeads[stage] ?? []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="rounded-lg border border-border bg-card p-3 shadow-xl w-72 rotate-2 opacity-90">
                <p className="text-sm font-semibold text-foreground">{activeCard.name}</p>
                {activeCard.company && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeCard.company}</p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
