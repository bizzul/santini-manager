"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { MomentumKanban } from "./MomentumKanban";
import { DetailSheetSection } from "@/components/layout/detail-sheet-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  FORNITORE_CATEGORIA_LABEL,
  STATO_INGAGGIO_LABEL,
  TASK_COLUMNS,
  formatCHF,
  formatEUDate,
  type EvEventoFornitore,
  type EvEventoTask,
  type EvFattura,
  type EvFornitore,
  type StatoIngaggio,
  type TaskStato,
  type FornitoreCategoria,
} from "./types";
import {
  addFattura,
  addFornitore,
  addTask,
  moveTask,
  updateFornitoreIngaggio,
} from "@/app/sites/[domain]/momentum/actions";

const INGAGGIO_VALUES: StatoIngaggio[] = [
  "da_contattare",
  "in_trattativa",
  "confermato",
  "pagato",
];

export default function SchedaEventoClient({
  domain,
  eventoId,
  fornitori,
  tasks,
  fatture,
  catalogoFornitori,
  budgetPrevisto,
  ricavoPrevisto,
}: {
  domain: string;
  eventoId: string;
  fornitori: EvEventoFornitore[];
  tasks: EvEventoTask[];
  fatture: EvFattura[];
  catalogoFornitori: EvFornitore[];
  budgetPrevisto: number | null;
  ricavoPrevisto: number | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();

  const fornitoriByCat = React.useMemo(() => {
    const map = new Map<FornitoreCategoria, EvEventoFornitore[]>();
    for (const f of fornitori) {
      const cat = (f.fornitore?.categoria || "materials") as FornitoreCategoria;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(f);
    }
    return map;
  }, [fornitori]);

  const totaleIn = fatture
    .filter((f) => f.direzione === "in")
    .reduce((s, f) => s + Number(f.importo), 0);
  const totaleOut = fatture
    .filter((f) => f.direzione === "out")
    .reduce((s, f) => s + Number(f.importo), 0);
  const margineReale = totaleOut - totaleIn;
  const marginePrevisto =
    (Number(ricavoPrevisto) || 0) - (Number(budgetPrevisto) || 0);

  function run(fn: () => Promise<unknown>, okMsg?: string) {
    startTransition(async () => {
      try {
        await fn();
        if (okMsg) toast({ title: okMsg });
        router.refresh();
      } catch (e) {
        toast({
          title: "Errore",
          description: e instanceof Error ? e.message : "Operazione fallita",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <>
      {/* FORNITORI & ARTISTI */}
      <DetailSheetSection
        title="Fornitori & Artisti"
        actions={
          <AddFornitoreDialog
            catalogo={catalogoFornitori}
            disabled={pending}
            onAdd={(fornitoreId, ruolo, stato, costo) =>
              run(
                () =>
                  addFornitore(domain, eventoId, fornitoreId, ruolo, stato, costo),
                "Fornitore aggiunto"
              )
            }
          />
        }
      >
        {fornitori.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nessun fornitore collegato.
          </p>
        ) : (
          <div className="space-y-4">
            {Array.from(fornitoriByCat.entries()).map(([cat, list]) => (
              <div key={cat}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {FORNITORE_CATEGORIA_LABEL[cat]}
                </p>
                <div className="space-y-2">
                  {list.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card/60 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {f.fornitore?.nome || "Fornitore"}
                        </p>
                        {f.ruolo ? (
                          <p className="text-xs text-muted-foreground">
                            {f.ruolo}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">
                          {formatCHF(f.costo)}
                        </span>
                        <Select
                          value={f.stato_ingaggio}
                          onValueChange={(v) =>
                            run(
                              () =>
                                updateFornitoreIngaggio(
                                  domain,
                                  eventoId,
                                  f.id,
                                  v as StatoIngaggio
                                ),
                              "Stato aggiornato"
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INGAGGIO_VALUES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {STATO_INGAGGIO_LABEL[v]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSheetSection>

      {/* TASK */}
      <DetailSheetSection
        title="Task"
        actions={
          <AddTaskInline
            disabled={pending}
            onAdd={(titolo) =>
              run(() => addTask(domain, eventoId, titolo), "Task aggiunto")
            }
          />
        }
      >
        <MomentumKanban
          columns={TASK_COLUMNS}
          items={tasks.map((t) => ({ ...t, columnId: t.stato }))}
          renderCard={(t) => (
            <div className="rounded-lg border bg-card p-2 text-sm text-foreground">
              <p className="font-medium">{t.titolo}</p>
              {t.assegnatario ? (
                <p className="text-xs text-muted-foreground">{t.assegnatario}</p>
              ) : null}
              {t.scadenza ? (
                <p className="text-xs text-muted-foreground">
                  {formatEUDate(t.scadenza)}
                </p>
              ) : null}
            </div>
          )}
          onMove={(taskId, toColumnId) =>
            run(() => moveTask(domain, taskId, toColumnId as TaskStato))
          }
          compact
          emptyLabel="—"
        />
      </DetailSheetSection>

      {/* BUDGET / CONSUNTIVO */}
      <DetailSheetSection
        title="Budget / Consuntivo"
        actions={
          <AddFatturaDialog
            disabled={pending}
            onAdd={(direzione, descrizione, importo) =>
              run(
                () => addFattura(domain, eventoId, direzione, descrizione, importo),
                "Fattura aggiunta"
              )
            }
          />
        }
      >
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Fatture IN" value={formatCHF(totaleIn)} />
          <Stat label="Fatture OUT" value={formatCHF(totaleOut)} />
          <Stat
            label="Margine previsto"
            value={formatCHF(marginePrevisto)}
          />
          <Stat
            label="Margine reale"
            value={formatCHF(margineReale)}
            positive={margineReale >= 0}
          />
        </div>
        {fatture.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nessuna fattura registrata.
          </p>
        ) : (
          <div className="space-y-2">
            {fatture.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium",
                      f.direzione === "out"
                        ? "bg-info/15 text-info"
                        : "bg-warning/15 text-warning"
                    )}
                  >
                    {f.direzione === "out" ? "OUT" : "IN"}
                  </span>
                  <span className="text-sm text-foreground">
                    {f.descrizione || "Fattura"}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatCHF(f.importo)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DetailSheetSection>
    </>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold",
          positive === undefined
            ? "text-foreground"
            : positive
              ? "text-success"
              : "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AddFornitoreDialog({
  catalogo,
  onAdd,
  disabled,
}: {
  catalogo: EvFornitore[];
  onAdd: (
    fornitoreId: string,
    ruolo: string | null,
    stato: StatoIngaggio,
    costo: number | null
  ) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [fornitoreId, setFornitoreId] = React.useState("");
  const [ruolo, setRuolo] = React.useState("");
  const [stato, setStato] = React.useState<StatoIngaggio>("da_contattare");
  const [costo, setCosto] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" /> Fornitore
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi fornitore</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Fornitore</Label>
            <Select value={fornitoreId} onValueChange={setFornitoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {catalogo.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome} · {FORNITORE_CATEGORIA_LABEL[f.categoria]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ruolo</Label>
            <Input
              value={ruolo}
              onChange={(e) => setRuolo(e.target.value)}
              placeholder="es. DJ headliner"
            />
          </div>
          <div>
            <Label>Stato ingaggio</Label>
            <Select
              value={stato}
              onValueChange={(v) => setStato(v as StatoIngaggio)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INGAGGIO_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {STATO_INGAGGIO_LABEL[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Costo (CHF)</Label>
            <Input
              type="number"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!fornitoreId || disabled}
            onClick={() => {
              onAdd(
                fornitoreId,
                ruolo || null,
                stato,
                costo ? Number(costo) : null
              );
              setOpen(false);
              setFornitoreId("");
              setRuolo("");
              setCosto("");
              setStato("da_contattare");
            }}
          >
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTaskInline({
  onAdd,
  disabled,
}: {
  onAdd: (titolo: string) => void;
  disabled?: boolean;
}) {
  const [titolo, setTitolo] = React.useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!titolo.trim()) return;
        onAdd(titolo.trim());
        setTitolo("");
      }}
    >
      <Input
        value={titolo}
        onChange={(e) => setTitolo(e.target.value)}
        placeholder="Nuovo task"
        className="h-8 w-40"
      />
      <Button size="sm" type="submit" variant="outline" disabled={disabled}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}

function AddFatturaDialog({
  onAdd,
  disabled,
}: {
  onAdd: (
    direzione: "in" | "out",
    descrizione: string | null,
    importo: number
  ) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [direzione, setDirezione] = React.useState<"in" | "out">("out");
  const [descrizione, setDescrizione] = React.useState("");
  const [importo, setImporto] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" /> Fattura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi fattura</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Direzione</Label>
            <Select
              value={direzione}
              onValueChange={(v) => setDirezione(v as "in" | "out")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="out">OUT — cliente da incassare</SelectItem>
                <SelectItem value="in">IN — fornitore da pagare</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrizione</Label>
            <Input
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div>
            <Label>Importo (CHF)</Label>
            <Input
              type="number"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!importo || disabled}
            onClick={() => {
              onAdd(direzione, descrizione || null, Number(importo));
              setOpen(false);
              setDescrizione("");
              setImporto("");
              setDirezione("out");
            }}
          >
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
