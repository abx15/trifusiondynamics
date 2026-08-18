"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KanbanBoard, type KanbanItem, type KanbanColumnDef } from "@/components/shared/KanbanBoard";
import { useCandidates, useUpdateCandidateStage, useCreateCandidate, type Candidate } from "@/lib/hooks/useHR";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, User, FileText, Mail, Tag, Loader2, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const COLUMNS: KanbanColumnDef[] = [
  { id: "APPLIED", title: "Applied", colorClass: "border-t-blue-400" },
  { id: "SCREENING", title: "Screening", colorClass: "border-t-purple-400" },
  { id: "INTERVIEW", title: "Interview", colorClass: "border-t-amber-400" },
  { id: "OFFERED", title: "Offered", colorClass: "border-t-pink-400" },
  { id: "HIRED", title: "Hired", colorClass: "border-t-emerald-400" },
  { id: "REJECTED", title: "Rejected", colorClass: "border-t-rose-400" },
];

export default function RecruitmentKanbanPage() {
  const { data: candidates = [], isLoading } = useCandidates();
  const updateStage = useUpdateCandidateStage();
  const createCandidate = useCreateCandidate();

  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Form states
  const [candidateName, setCandidateName] = React.useState("");
  const [candidateEmail, setCandidateEmail] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Map candidates to KanbanItem format
  const kanbanItems = React.useMemo(() => {
    return candidates.map((c) => ({
      ...c,
      columnId: c.stage, // Dnd board uses columnId instead of stage
    }));
  }, [candidates]);

  const handleMoveItem = (itemId: string, targetStage: string) => {
    // Optimistic toast or updates are handled by invalidating query on success
    updateStage.mutate(
      { id: itemId, stage: targetStage },
      {
        onSuccess: (data) => {
          toast.success(`Moved ${data.candidateName} to ${targetStage}`);
        },
        onError: () => {
          toast.error("Failed to move candidate.");
        },
      }
    );
  };

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateName || !candidateEmail || !position) {
      toast.error("Name, email, and position are required.");
      return;
    }

    createCandidate.mutate(
      {
        candidateName,
        candidateEmail,
        position,
        department: department || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Successfully added candidate.");
          setIsAddOpen(false);
          // reset form
          setCandidateName("");
          setCandidateEmail("");
          setPosition("");
          setDepartment("");
          setNotes("");
        },
        onError: () => {
          toast.error("Failed to create candidate.");
        },
      }
    );
  };

  const renderCardItem = (item: KanbanItem) => {
    const candidate = item as unknown as Candidate;
    return (
      <div className="space-y-2 text-xs">
        <div>
          <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {candidate.candidateName}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
            {candidate.candidateEmail}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-foreground uppercase">
            <Tag className="h-2.5 w-2.5 text-slate-400" />
            {candidate.position}
          </span>
          {candidate.department && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">
              {candidate.department}
            </span>
          )}
        </div>

        {candidate.notes && (
          <p className="text-[10px] text-slate-500 line-clamp-2 italic bg-slate-50/50 dark:bg-zinc-800/20 p-1.5 rounded border border-border/50">
            "{candidate.notes}"
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[80vh]">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Recruitment Board"
          breadcrumbs={[{ label: "Operations" }, { label: "HR Portal" }, { label: "Recruitment" }]}
        />
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="w-72 shrink-0 h-96 rounded-xl border border-border bg-slate-100 dark:bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <KanbanBoard
            columns={COLUMNS}
            items={kanbanItems}
            onMoveItem={handleMoveItem}
            renderItem={renderCardItem}
          />
        </div>
      )}

      {/* Add Candidate Sheet */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md bg-card">
          <SheetHeader>
            <SheetTitle>Add Candidate</SheetTitle>
            <SheetDescription>
              Create a new candidate profile to track their progress through your recruitment pipelines.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateCandidate} className="space-y-4 mt-6 text-xs">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Candidate Name *</label>
              <Input
                type="text"
                placeholder="e.g. Grace Hopper"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Candidate Email *</label>
              <Input
                type="email"
                placeholder="e.g. grace@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Position *</label>
              <Input
                type="text"
                placeholder="e.g. Product Manager"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Management">Management</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Notes / Feedback</label>
              <textarea
                placeholder="e.g. Strong technical fundamentals in algorithms."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={createCandidate.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createCandidate.isPending || !candidateName || !candidateEmail || !position}
                className="gap-2"
              >
                {createCandidate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add to Pipeline
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
