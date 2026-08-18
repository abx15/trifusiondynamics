"use client";

import * as React from "react";
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
import { GripVertical } from "lucide-react";

export interface KanbanItem {
  id: string;
  columnId: string;
  [key: string]: any;
}

export interface KanbanColumnDef {
  id: string;
  title: string;
  colorClass?: string;
}

interface KanbanBoardProps<T extends KanbanItem> {
  columns: KanbanColumnDef[];
  items: T[];
  onMoveItem: (itemId: string, targetColumnId: string) => void;
  renderItem: (item: T) => React.ReactNode;
  renderColumnHeaderSuffix?: (columnId: string, columnItems: T[]) => React.ReactNode;
}

function SortableCard<T extends KanbanItem>({
  item,
  renderItem,
}: {
  item: T;
  renderItem: (item: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-all"
    >
      <div className="absolute right-2 top-2">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="pr-6">
        {renderItem(item)}
      </div>
    </div>
  );
}

export function KanbanBoard<T extends KanbanItem>({
  columns,
  items,
  onMoveItem,
  renderItem,
  renderColumnHeaderSuffix,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeItem = React.useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [items, activeId]
  );

  const groupedItems = React.useMemo(() => {
    const map: Record<string, T[]> = {};
    columns.forEach((col) => (map[col.id] = []));
    items.forEach((item) => {
      if (map[item.columnId]) {
        map[item.columnId].push(item);
      }
    });
    return map;
  }, [columns, items]);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    const targetColumnId = columns.some((col) => col.id === overId)
      ? overId
      : items.find((item) => item.id === overId)?.columnId;

    if (!targetColumnId) return;

    const dragged = items.find((item) => item.id === draggedId);
    if (!dragged || dragged.columnId === targetColumnId) return;

    onMoveItem(draggedId, targetColumnId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {columns.map((col) => {
          const colItems = groupedItems[col.id] ?? [];
          return (
            <div
              key={col.id}
              className={`flex flex-col w-72 shrink-0 rounded-xl border border-border border-t-4 ${
                col.colorClass || "border-t-slate-300"
              } bg-slate-50/60 dark:bg-zinc-900/40`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
                    {col.title}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                    {colItems.length}
                  </span>
                </div>
                {renderColumnHeaderSuffix && renderColumnHeaderSuffix(col.id, colItems)}
              </div>

              {/* Cards area */}
              <SortableContext
                items={colItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
                  {colItems.map((item) => (
                    <SortableCard
                      key={item.id}
                      item={item}
                      renderItem={renderItem}
                    />
                  ))}
                  {colItems.length === 0 && (
                    <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-border">
                      <p className="text-xs text-muted-foreground">Drop here</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="rounded-lg border border-border bg-card p-3 shadow-xl w-72 rotate-2 opacity-90">
            {renderItem(activeItem)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
