import { notFound, redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchEventoDetail } from "@/lib/momentum-data";
import { DetailSheetLayout } from "@/components/layout/detail-sheet-layout";
import SchedaEventoClient from "@/components/momentum/SchedaEventoClient";
import {
  CATEGORIA_PRODOTTO_LABEL,
  CLIENTE_TIPO_LABEL,
  formatEUDate,
} from "@/components/momentum/types";

const PLAN_LABEL: Record<string, string> = {
  to_plan: "To Plan",
  planning: "Planning",
  planned: "Planned",
  confirmed: "Confirmed",
  live: "Live",
  finish: "Finish",
};
const ACCOUNTING_LABEL: Record<string, string> = {
  invoice_in: "Invoice IN",
  invoice_out: "Invoice OUT",
  balance: "Balance",
  close: "Close",
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

export default async function SchedaEvento({
  params,
}: {
  params: Promise<{ domain: string; id: string }>;
}) {
  const { domain, id } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const { siteId } = await requireServerSiteContext(domain);
  const detail = await fetchEventoDetail(siteId, id);
  if (!detail) return notFound();

  const { evento, fornitori, tasks, fatture, catalogoFornitori } = detail;
  const accent = evento.tipo_evento === "pvt" ? "#6366f1" : "#0ea5e9";

  const orari =
    evento.ora_inizio || evento.ora_fine
      ? `${evento.ora_inizio?.slice(0, 5) || ""}${
          evento.ora_fine ? ` – ${evento.ora_fine.slice(0, 5)}` : ""
        }`
      : null;

  return (
    <DetailSheetLayout
      backHref={`/sites/${domain}/momentum/plan`}
      backLabel="Torna a Plan"
      accentColor={accent}
      title={evento.titolo}
      subtitle={`${evento.senza_data ? "Data da fissare" : formatEUDate(evento.data_evento)}${orari ? ` · ${orari}` : ""}`}
      meta={
        <>
          {evento.cliente ? (
            <Badge>
              {evento.cliente.nome} · {CLIENTE_TIPO_LABEL[evento.cliente.tipo]}
            </Badge>
          ) : null}
          {evento.location ? <Badge>{evento.location.nome}</Badge> : null}
          <Badge>
            {evento.tipo_evento === "pvt" ? "PVT" : "PUBLIC"} ·{" "}
            {CATEGORIA_PRODOTTO_LABEL[evento.categoria_prodotto]}
          </Badge>
          <Badge>Plan: {PLAN_LABEL[evento.stato_plan]}</Badge>
          {evento.stato_accounting ? (
            <Badge>Accounting: {ACCOUNTING_LABEL[evento.stato_accounting]}</Badge>
          ) : null}
          {evento.senza_data ? <Badge>Data da fissare</Badge> : null}
          {evento.volo_brandizzato ? <Badge>Volo brandizzato</Badge> : null}
        </>
      }
    >
      {evento.immagine_url ? (
        <div className="mb-4 h-48 w-full overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={evento.immagine_url}
            alt={evento.titolo}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <SchedaEventoClient
        domain={domain}
        eventoId={evento.id}
        fornitori={fornitori}
        tasks={tasks}
        fatture={fatture}
        catalogoFornitori={catalogoFornitori}
        budgetPrevisto={evento.budget_previsto}
        ricavoPrevisto={evento.ricavo_previsto}
      />
    </DetailSheetLayout>
  );
}
