"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MomentumKanban } from "./MomentumKanban";
import { AccountingCard, type AccountingCardData } from "./cards";
import { ACCOUNTING_COLUMNS, type StatoAccounting } from "./types";
import { moveEventoAccounting } from "@/app/sites/[domain]/momentum/actions";
import { useToast } from "@/components/ui/use-toast";

export type AccountingEvento = AccountingCardData & {
  stato_accounting: StatoAccounting;
};

export default function AccountingBoard({
  domain,
  eventi,
}: {
  domain: string;
  eventi: AccountingEvento[];
}) {
  const [items, setItems] = React.useState(eventi);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => setItems(eventi), [eventi]);

  const kanbanItems = items.map((e) => ({ ...e, columnId: e.stato_accounting }));

  async function handleMove(id: string, toColumnId: string) {
    const prev = items;
    const toStato = toColumnId as StatoAccounting;
    setItems((cur) =>
      cur.map((e) => (e.id === id ? { ...e, stato_accounting: toStato } : e))
    );
    try {
      await moveEventoAccounting(domain, id, toStato);
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
      columns={ACCOUNTING_COLUMNS}
      items={kanbanItems}
      renderCard={(item) => (
        <AccountingCard
          evento={item}
          onClick={() =>
            router.push(`/sites/${domain}/momentum/eventi/${item.id}`)
          }
        />
      )}
      onMove={handleMove}
      emptyLabel="Nessun evento"
    />
  );
}
