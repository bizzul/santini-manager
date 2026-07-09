"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createItem } from "@/app/sites/[domain]/personal-manager/actions";
import type { AreaSlug } from "@/lib/personal-manager/types";

interface ItemCreateDialogProps {
  area: AreaSlug;
  label: string;
  accent: string;
}

export function ItemCreateDialog({ area, label, accent }: ItemCreateDialogProps) {
  const { domain } = usePmContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("3");
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setNotes("");
    setPriority("3");
    setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" style={{ backgroundColor: accent }} className="text-white">
          <Plus className="mr-1 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pm-title">Titolo</Label>
            <Input
              id="pm-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Completare corso avanzato"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pm-notes">Note</Label>
            <Textarea
              id="pm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Dettagli opzionali"
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
                  <SelectItem value="1">1 · Bassa</SelectItem>
                  <SelectItem value="2">2 · Medio-bassa</SelectItem>
                  <SelectItem value="3">3 · Media</SelectItem>
                  <SelectItem value="4">4 · Alta</SelectItem>
                  <SelectItem value="5">5 · Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-due">Scadenza</Label>
              <Input
                id="pm-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={isPending || !title.trim()}
            onClick={() =>
              startTransition(async () => {
                try {
                  await createItem(domain, {
                    area_slug: area,
                    title,
                    notes,
                    priority: Number(priority),
                    due_date: dueDate || null,
                  });
                  toast({ title: "Elemento creato" });
                  reset();
                  setOpen(false);
                } catch (err) {
                  toast({
                    title: "Errore",
                    description:
                      err instanceof Error ? err.message : "Riprova piu' tardi",
                    variant: "destructive",
                  });
                }
              })
            }
          >
            {isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
