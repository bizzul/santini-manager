"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MomentumKanban } from "./MomentumKanban";
import { OffertaCard } from "./cards";
import { OFFERTA_COLUMNS, type EvOfferta } from "./types";
import { moveOfferta } from "@/app/sites/[domain]/momentum/actions";
import { useToast } from "@/components/ui/use-toast";

export default function VenditaBoard({
  domain,
  offerte,
}: {
  domain: string;
  offerte: EvOfferta[];
}) {
  const [items, setItems] = React.useState(offerte);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => setItems(offerte), [offerte]);

  const kanbanItems = items.map((o) => ({ ...o, columnId: o.stato }));

  async function handleMove(id: string, toColumnId: string) {
    const prev = items;
    const toStato = toColumnId as EvOfferta["stato"];
    setItems((cur) =>
      cur.map((o) => (o.id === id ? { ...o, stato: toStato } : o))
    );
    try {
      await moveOfferta(domain, id, toStato);
      if (toStato === "vinta") {
        toast({
          title: "Offerta vinta",
          description: "Evento creato automaticamente nel flusso Plan.",
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
    <MomentumKanban
      columns={OFFERTA_COLUMNS}
      items={kanbanItems}
      renderCard={(item) => <OffertaCard offerta={item} />}
      onMove={handleMove}
      emptyLabel="Nessuna offerta"
    />
  );
}
