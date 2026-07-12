"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { usePmContext } from "@/components/personal-manager/pm-context";
import { CategoryChips } from "@/components/personal-manager/MobileShell";
import {
  softDeleteItem,
  updateItem,
} from "@/app/personale/actions";
import {
  getAreaDef,
  ITEM_STATUS_LABELS,
  type ItemStatus,
  type PmItem,
  type PmItemSnapshot,
} from "@/lib/personal-manager/types";

interface ItemDetailProps {
  item: PmItem;
  snapshots: PmItemSnapshot[];
  canEdit: boolean;
  projection: string;
}

const STATUSES: ItemStatus[] = ["open", "in_progress", "postponed", "done"];

export function ItemDetail({ item, snapshots, canEdit, projection }: ItemDetailProps) {
  const router = useRouter();
  const { base } = usePmContext();
  const { toast } = useToast();
  const area = getAreaDef(item.area_slug);

  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [priority, setPriority] = useState(String(item.priority));
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      try {
        await updateItem(item.id, {
          title,
          notes,
          priority: Number(priority),
          status,
          due_date: dueDate || null,
        });
        toast({ title: "Modifiche salvate" });
        router.refresh();
      } catch (err) {
        toast({
          title: "Errore",
          description: err instanceof Error ? err.message : "Riprova piu' tardi",
          variant: "destructive",
        });
      }
    });

  const remove = () =>
    startTransition(async () => {
      try {
        await softDeleteItem(item.id);
        toast({ title: "Elemento eliminato" });
        router.push(`${base}/area/${item.area_slug}`);
      } catch (err) {
        toast({
          title: "Errore",
          description: err instanceof Error ? err.message : "Riprova piu' tardi",
          variant: "destructive",
        });
      }
    });

  return (
    <div>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Indietro
      </button>

      <CategoryChips
        items={[{ label: area?.label ?? item.area_slug, color: area?.accent }]}
      />

      {/* Stato istantaneo */}
      <div
        className="rounded-2xl p-4 text-white"
        style={{ backgroundColor: area?.accent ?? "#6b7280" }}
      >
        <p className="text-lg font-bold">{item.title}</p>
        <div className="mt-2 flex items-center gap-3 text-sm text-white/90">
          <span className="rounded-full bg-white/20 px-2 py-0.5">
            {ITEM_STATUS_LABELS[item.status]}
          </span>
          <span>Priorita&apos; {item.priority}</span>
        </div>
      </div>

      {/* Proiezione */}
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Stima completamento
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{projection}</p>
      </div>

      {/* Form edit */}
      {canEdit ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-3">
          <div className="space-y-1.5">
            <Label htmlFor="d-title">Titolo</Label>
            <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-notes">Note</Label>
            <Textarea
              id="d-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priorita&apos;</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ItemStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ITEM_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-due">Scadenza</Label>
            <Input
              id="d-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={isPending} onClick={save}>
              {isPending ? "Salvataggio…" : "Salva"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={isPending}
              onClick={remove}
              aria-label="Elimina"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Storico snapshot */}
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Storico stato
        </h2>
        {snapshots.length > 0 ? (
          <ol className="relative space-y-3 border-l border-border pl-5">
            {[...snapshots].reverse().map((snap) => (
              <li key={snap.id} className="relative">
                <span
                  className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-card"
                  style={{ backgroundColor: area?.accent ?? "#6b7280" }}
                />
                <p className="text-sm text-foreground">
                  {ITEM_STATUS_LABELS[snap.status]} · P{snap.priority}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(snap.snapshot_at).toLocaleString("it-IT")}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Nessuno snapshot registrato.</p>
        )}
      </div>
    </div>
  );
}
