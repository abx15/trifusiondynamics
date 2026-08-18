"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CheckSquare, Square, GripVertical, Loader2 } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
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
import { useProject, useUpdateProject } from "@/lib/hooks/useProjects";
import { useTasks, useCreateTask, useMoveTask, type Task } from "@/lib/hooks/useTasks";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { toast } from "@/lib/toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type Tab = "overview" | "tasks" | "milestones" | "timeline";

const TASK_STAGES: Task["status"][] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const taskSchema = z.object({
  title: z.string().min(2, "Title required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card p-3 space-y-1.5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-2">
        <p className="text-xs font-medium text-foreground flex-1">{task.title}</p>
        <button {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={task.priority} size="sm" />
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = React.useState<Tab>("overview");
  const { data: project, isLoading } = useProject(id);
  const { data: tasksData } = useTasks({ projectId: id, limit: 200 });
  const createTask = useCreateTask();
  const moveTask = useMoveTask();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [optimisticTasks, setOptimisticTasks] = React.useState<Task[] | null>(null);
  const [showTaskForm, setShowTaskForm] = React.useState<Task["status"] | null>(null);

  const allTasks = optimisticTasks ?? tasksData?.data ?? [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const groupedTasks = React.useMemo(() => {
    const map: Record<string, Task[]> = {};
    TASK_STAGES.forEach((s) => (map[s] = []));
    allTasks.forEach((t) => { if (map[t.status]) map[t.status].push(t); });
    return map;
  }, [allTasks]);

  const activeTask = allTasks.find((t) => t.id === activeId);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: "MEDIUM" },
  });

  const onCreateTask = async (data: TaskForm) => {
    if (!showTaskForm) return;
    try {
      await createTask.mutateAsync({ projectId: id, status: showTaskForm, ...data });
      toast.success("Task created");
      reset();
      setShowTaskForm(null);
    } catch {
      toast.error("Failed to create task");
    }
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const draggedId = active.id as string;
    const overId = over.id as string;
    const targetStatus = TASK_STAGES.includes(overId as Task["status"])
      ? (overId as Task["status"])
      : allTasks.find((t) => t.id === overId)?.status;
    if (!targetStatus) return;
    const dragged = allTasks.find((t) => t.id === draggedId);
    if (!dragged || dragged.status === targetStatus) return;
    const snapshot = [...allTasks];
    setOptimisticTasks(allTasks.map((t) => t.id === draggedId ? { ...t, status: targetStatus } : t));
    moveTask.mutate({ id: draggedId, status: targetStatus }, {
      onError: () => { setOptimisticTasks(snapshot); toast.error("Failed to move task."); },
      onSuccess: () => setOptimisticTasks(null),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />)}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found.</p>
        <Link href="/projects" className="text-primary text-sm mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  const completedMilestones = (project.milestones ?? []).filter((m) => m.completed).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <StatusBadge status={project.status} size="md" />
              <StatusBadge status={project.priority} size="md" />
            </div>
            {project.client && (
              <Link href={`/clients/${project.client.id}`} className="text-sm text-primary hover:underline">
                {project.client.name}
              </Link>
            )}
          </div>
        </div>
        {project.budget && <MoneyDisplay amount={project.budget} size="lg" className="text-foreground" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "tasks", "milestones", "timeline"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Status", value: <StatusBadge status={project.status} size="md" /> },
            { label: "Priority", value: <StatusBadge status={project.priority} size="md" /> },
            { label: "Start Date", value: project.startDate ? new Date(project.startDate).toLocaleDateString("en-IN") : "—" },
            { label: "Due Date", value: project.dueDate ? new Date(project.dueDate).toLocaleDateString("en-IN") : "—" },
            { label: "Tasks", value: `${allTasks.filter((t) => t.status === "DONE").length} / ${allTasks.length} done` },
            { label: "Milestones", value: `${completedMilestones} / ${project.milestones?.length ?? 0} done` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
              <div className="text-sm text-foreground font-medium">{value}</div>
            </div>
          ))}
          {project.description && (
            <div className="col-span-3 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Tasks Kanban */}
      {tab === "tasks" && (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={({ active }: DragStartEvent) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {TASK_STAGES.map((stage) => (
              <div key={stage} className="flex flex-col w-64 shrink-0 rounded-xl border border-border bg-slate-50/60 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <StatusBadge status={stage} size="sm" />
                  <button onClick={() => setShowTaskForm(stage === showTaskForm ? null : stage)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {showTaskForm === stage && (
                  <form onSubmit={handleSubmit(onCreateTask)} className="p-3 border-b border-border space-y-2">
                    <input {...register("title")} placeholder="Task title" autoFocus className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    <select {...register("priority")} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input {...register("dueDate")} type="date" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setShowTaskForm(null)} className="flex-1 text-xs rounded border border-border py-1 text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">Cancel</button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 text-xs rounded bg-primary py-1 text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-60">
                        {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                        Add
                      </button>
                    </div>
                  </form>
                )}

                <SortableContext items={groupedTasks[stage].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex-1 p-2 space-y-2 min-h-[100px]">
                    {groupedTasks[stage].map((task) => <TaskCard key={task.id} task={task} />)}
                    {groupedTasks[stage].length === 0 && (
                      <div className="flex items-center justify-center h-16 rounded border-2 border-dashed border-border">
                        <p className="text-[10px] text-muted-foreground">Empty</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="rounded-lg border border-border bg-card p-3 shadow-xl w-64 rotate-1 opacity-90">
                <p className="text-xs font-medium text-foreground">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Milestones */}
      {tab === "milestones" && (
        <div className="space-y-3">
          {(project.milestones ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No milestones configured.</p>
          ) : (
            (project.milestones ?? []).map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
                {m.completed ? (
                  <CheckSquare className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${m.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {m.title}
                  </p>
                  {m.dueDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {new Date(m.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
                {m.completed && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full px-2 py-0.5 font-medium">Done</span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Timeline */}
      {tab === "timeline" && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Project Timeline</h3>
          {!project.startDate && !project.dueDate ? (
            <p className="text-sm text-muted-foreground">No timeline dates set.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Start: </span>
                  <span className="font-medium text-foreground">
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                      : "Not set"}
                  </span>
                </div>
                <div className="flex-1 h-0.5 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Due: </span>
                  <span className="font-medium text-foreground">
                    {project.dueDate
                      ? new Date(project.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                      : "Not set"}
                  </span>
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                </div>
              </div>

              {/* Milestone markers */}
              {(project.milestones ?? []).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestone checkpoints</p>
                  {(project.milestones ?? []).filter((m) => m.dueDate).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 text-xs">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${m.completed ? "bg-green-500" : "bg-yellow-500"}`} />
                      <span className={m.completed ? "line-through text-muted-foreground" : "text-foreground"}>{m.title}</span>
                      <span className="text-muted-foreground ml-auto">
                        {new Date(m.dueDate!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
