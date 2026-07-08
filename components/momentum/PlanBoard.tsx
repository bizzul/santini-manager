"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MomentumKanban } from "./MomentumKanban";
import { EventoCard, type EventoCardData } from "./cards";
import { PLAN_COLUMNS, type StatoPlan, type TipoEvento } from "./types";
import { moveEventoPlan } from "@/app/sites/[domain]/momentum/actions";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export type PlanEvento = EventoCardData & {
  stato_plan: StatoPlan;
};

export default function PlanBoard({
  domain,
  eventi,
}: {
  domain: string;
  eventi: PlanEvento[];
}) {
  const [items, setItems] = React.useState(eventi);
  const [tipo, setTipo] = React.useState<TipoEvento>("pvt");
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => setItems(eventi), [eventi]);

  const filtered = items.filter((e) => e.tipo_evento === tipo);
  const kanbanItems = filtered.map((e) => ({ ...e, columnId: e.stato_plan }));

  async function handleMove(id: string, toColumnId: string) {
    const prev = items;
    const toStato = toColumnId as StatoPlan;
    setItems((cur) =>
      cur.map((e) => (e.id === id ? { ...e, stato_plan: toStato } : e))
    );
    try {
      await moveEventoPlan(domain, id, toStato);
      if (toStato === "finish") {
        toast({
          title: "Evento concluso",
          description: "L'evento entra ora nel flusso Accounting.",
        });
      }
      router.refresh();
    } catch (e) {
      setItems(prev);
      toast({
        title: "Errore",
        description: e instanceof Error ? e.message : "Spostamento non riuscito",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-1 rounded-lg border bg-card/60 p-1">
        {(["pvt", "public"] as TipoEvento[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tipo === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "pvt" ? "PVT" : "PUBLIC"}
          </button>
        ))}
      </div>
      <MomentumKanban
        columns={PLAN_COLUMNS}
        items={kanbanItems}
        renderCard={(item) => (
          <EventoCard
            evento={item}
            onClick={() =>
              router.push(`/sites/${domain}/momentum/eventi/${item.id}`)
            }
          />
        )}
        onMove={handleMove}
        emptyLabel="Nessun evento"
      />
    </div>
  );
}
