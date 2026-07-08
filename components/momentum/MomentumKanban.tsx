"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { KanbanColumnDef } from "./types";

export interface KanbanItem {
  id: string;
  columnId: string;
}

interface MomentumKanbanProps<T extends KanbanItem> {
  columns: KanbanColumnDef[];
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  onMove: (itemId: string, toColumnId: string) => void | Promise<void>;
  /** Compact layout for embedded mini-kanbans (task board). */
  compact?: boolean;
  emptyLabel?: string;
}

function DraggableCard({
  id,
  children,
  disabled,
}: {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      {children}
    </div>
  );
}

function Column({
  column,
  compact,
  children,
  count,
}: {
  column: KanbanColumnDef;
  compact?: boolean;
  children: React.ReactNode;
  count: number;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: { columnId: column.id },
  });

  return (
    <div
      className={cn(
        "flex min-w-[240px] flex-1 flex-col rounded-xl border bg-card/60",
        compact ? "min-w-[180px]" : "min-w-[240px]",
        isOver && "ring-2 ring-primary/60"
      )}
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl border-b px-3 py-2"
        style={{ borderTopColor: column.color, borderTopWidth: 3 }}
      >
        <span className="text-sm font-semibold text-foreground">
          {column.title}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-background"
          style={{ backgroundColor: column.color }}
        >
          {count}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 p-2",
          compact ? "min-h-[120px]" : "min-h-[200px]"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function MomentumKanban<T extends KanbanItem>({
  columns,
  items,
  renderCard,
  onMove,
  compact,
  emptyLabel = "Nessun elemento",
}: MomentumKanbanProps<T>) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const itemsByColumn = React.useMemo(() => {
    const map = new Map<string, T[]>();
    for (const col of columns) map.set(col.id, []);
    for (const item of items) {
      if (!map.has(item.columnId)) map.set(item.columnId, []);
      map.get(item.columnId)!.push(item);
    }
    return map;
  }, [columns, items]);

  const activeItem = React.useMemo(
    () => items.find((i) => i.id === activeId) || null,
    [items, activeId]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const itemId = String(active.id);
    const toColumnId = (over.data.current as { columnId?: string })?.columnId;
    if (!toColumnId) return;
    const current = items.find((i) => i.id === itemId);
    if (!current || current.columnId === toColumnId) return;
    void onMove(itemId, toColumnId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-2",
          compact ? "flex-col sm:flex-row" : ""
        )}
      >
        {columns.map((column) => {
          const colItems = itemsByColumn.get(column.id) || [];
          return (
            <Column
              key={column.id}
              column={column}
              compact={compact}
              count={colItems.length}
            >
              {colItems.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                  {emptyLabel}
                </p>
              ) : (
                colItems.map((item) => (
                  <DraggableCard key={item.id} id={item.id}>
                    {renderCard(item)}
                  </DraggableCard>
                ))
              )}
            </Column>
          );
        })}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="rotate-1 opacity-90">{renderCard(activeItem)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
