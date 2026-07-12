"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  type AttivitaBoardRow,
  type AttivitaStato,
  type BoardColumn,
  STATI,
  STATO_LABEL,
  STATO_COLORE,
} from "@/types/overview-connector";
import { moveAttivita } from "@/app/sites/[domain]/overview/actions/attivita.action";
import { BoardCard } from "./BoardCard";

interface ColMeta {
  limite: number;
  soglia: number;
}

interface PendingMove {
  card: AttivitaBoardRow;
  toStato: AttivitaStato;
  doingCount: number;
  limite: number;
}

function wipBarClass(pct: number): string {
  if (pct > 100) return "bg-destructive";
  if (pct >= 80) return "bg-warning";
  return "bg-success";
}

function DraggableCard({
  card,
  soglia,
}: {
  card: AttivitaBoardRow;
  soglia: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <BoardCard card={card} soglia={soglia} dragging={isDragging} />
    </div>
  );
}

function DroppableColumn({
  stato,
  children,
  overLimit,
}: {
  stato: AttivitaStato;
  children: React.ReactNode;
  overLimit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stato });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-24 flex-1 flex-col gap-2 rounded-lg border-2 bg-page-soft p-2 transition-colors",
        overLimit ? "border-destructive" : "border-transparent",
        isOver && "bg-primary/5 ring-2 ring-primary/40",
      )}
    >
      {children}
    </div>
  );
}

function ColumnHeader({
  column,
  count,
}: {
  column: BoardColumn;
  count: number;
}) {
  const pct = column.limite > 0 ? Math.round((count / column.limite) * 100) : 0;
  const overLimit = pct > 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: STATO_COLORE[column.stato] }}
          />
          <span className="text-sm font-semibold text-foreground">
            {column.label}
          </span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {count}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-medium tabular-nums",
            overLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {count} / {column.limite}
        </span>
        <span
          className={cn(
            "tabular-nums",
            overLimit ? "font-bold text-destructive" : "text-muted-foreground",
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", wipBarClass(pct))}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function ConnectorBoard({
  columns,
  domain,
}: {
  columns: BoardColumn[];
  domain: string;
}) {
  const meta = useMemo<Record<AttivitaStato, ColMeta>>(() => {
    const m = {} as Record<AttivitaStato, ColMeta>;
    for (const col of columns) {
      m[col.stato] = { limite: col.limite, soglia: col.soglia };
    }
    return m;
  }, [columns]);

  const propsCards = useMemo(
    () => columns.flatMap((c) => c.cards),
    [columns],
  );
  const signature = useMemo(
    () =>
      propsCards
        .map((c) => `${c.id}:${c.stato}:${c.giorni_fermo}`)
        .sort()
        .join("|"),
    [propsCards],
  );

  const [cards, setCards] = useState<AttivitaBoardRow[]>(propsCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [activeTab, setActiveTab] = useState<AttivitaStato>("todo");
  const lastSignature = useRef(signature);

  // Riallinea lo stato locale quando il server rivalida (realtime/refresh).
  useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      setCards(propsCards);
    }
  }, [signature, propsCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const cardsByStato = useCallback(
    (stato: AttivitaStato) =>
      cards
        .filter((c) => c.stato === stato)
        .sort((a, b) => b.giorni_fermo - a.giorni_fermo),
    [cards],
  );

  const performMove = useCallback(
    async (card: AttivitaBoardRow, toStato: AttivitaStato) => {
      const snapshot = cards;
      const today = new Date().toISOString().slice(0, 10);
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, stato: toStato, giorni_fermo: 0, data_stato: today }
            : c,
        ),
      );

      const res = await moveAttivita(card.id, toStato, domain);
      if (!res.ok) {
        setCards(snapshot);
        toast.error("Spostamento non riuscito", {
          description: res.error ?? "Riprova.",
        });
      }
    },
    [cards, domain],
  );

  const requestMove = useCallback(
    (cardId: string, toStato: AttivitaStato) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.stato === toStato) return;

      if (toStato === "doing") {
        const doingCount = cards.filter((c) => c.stato === "doing").length;
        const limite = meta.doing?.limite ?? 0;
        if (limite > 0 && doingCount + 1 > limite) {
          setPending({ card, toStato, doingCount, limite });
          return;
        }
      }
      void performMove(card, toStato);
    },
    [cards, meta, performMove],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;
      requestMove(String(active.id), over.id as AttivitaStato);
    },
    [requestMove],
  );

  const activeCard = activeId
    ? cards.find((c) => c.id === activeId) ?? null
    : null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Board</h2>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Trascina una card per cambiare stato. Ordinate per giorni fermi.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Desktop: tre colonne */}
        <div className="hidden gap-3 lg:grid lg:grid-cols-3">
          {STATI.map((stato) => {
            const column = columns.find((c) => c.stato === stato)!;
            const colCards = cardsByStato(stato);
            const pct =
              column.limite > 0
                ? Math.round((colCards.length / column.limite) * 100)
                : 0;
            return (
              <div key={stato} className="flex flex-col gap-2">
                <ColumnHeader column={column} count={colCards.length} />
                <DroppableColumn stato={stato} overLimit={pct > 100}>
                  {colCards.map((card) => (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      soglia={meta[stato]?.soglia ?? 14}
                    />
                  ))}
                  {colCards.length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                      Nessuna card.
                    </p>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeCard ? (
            <BoardCard
              card={activeCard}
              soglia={meta[activeCard.stato]?.soglia ?? 14}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Mobile: tab switcher (mai una griglia compressa) */}
      <div className="lg:hidden">
        <div className="mb-3 inline-flex w-full rounded-lg border border-border bg-page-soft p-1">
          {STATI.map((stato) => {
            const active = activeTab === stato;
            const count = cardsByStato(stato).length;
            return (
              <button
                key={stato}
                type="button"
                onClick={() => setActiveTab(stato)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {STATO_LABEL[stato]} ({count})
              </button>
            );
          })}
        </div>

        {(() => {
          const column = columns.find((c) => c.stato === activeTab)!;
          const colCards = cardsByStato(activeTab);
          return (
            <div className="flex flex-col gap-2">
              <ColumnHeader column={column} count={colCards.length} />
              <div className="flex flex-col gap-2">
                {colCards.map((card) => (
                  <div key={card.id} className="flex flex-col gap-1">
                    <BoardCard card={card} soglia={meta[activeTab]?.soglia ?? 14} />
                    <div className="flex gap-1">
                      {STATI.filter((s) => s !== activeTab).map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          className="h-7 flex-1 text-xs"
                          onClick={() => requestMove(card.id, s)}
                        >
                          {STATO_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {colCards.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                    Nessuna card.
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Dialog conferma sforamento WIP Doing */}
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limite WIP superato</DialogTitle>
            <DialogDescription>
              {pending
                ? `Doing e' gia' a ${pending.doingCount}/${pending.limite}. Superare il limite significa lavorare su troppe cose insieme. Confermi?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pending) {
                  void performMove(pending.card, pending.toStato);
                  setPending(null);
                }
              }}
            >
              Conferma comunque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
