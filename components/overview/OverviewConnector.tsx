import type { OverviewData } from "@/types/overview-connector";
import { OverviewHeader } from "./OverviewHeader";
import { KpiStrip } from "./KpiStrip";
import { AmbitoStatoMatrix } from "./AmbitoStatoMatrix";
import { ConnectorBoard } from "./ConnectorBoard";
import { CaricoPanel } from "./CaricoPanel";
import { ContenitoriFisiciPanel } from "./ContenitoriFisiciPanel";
import { OverviewRealtime } from "./OverviewRealtime";

export function OverviewConnector({ data }: { data: OverviewData }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <OverviewHeader domain={data.domain} filters={data.filters} />

      <KpiStrip kpi={data.kpi} />

      <AmbitoStatoMatrix
        domain={data.domain}
        filters={data.filters}
        matrix={data.matrix}
        totals={data.matrixTotals}
      />

      <ConnectorBoard columns={data.columns} domain={data.domain} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CaricoPanel
          domain={data.domain}
          filters={data.filters}
          titolo="Carico per Azienda"
          colonna="Azienda"
          rows={data.caricoAziende}
          filterKey="azienda"
        />
        <CaricoPanel
          domain={data.domain}
          filters={data.filters}
          titolo="Carico per Persona"
          colonna="Persona"
          rows={data.caricoPersone}
          filterKey="persona"
          highlightNome="Matteo Paolocci"
        />
      </div>

      <ContenitoriFisiciPanel kanbanCounts={data.kanbanCounts} />

      <OverviewRealtime siteId={data.siteId} />
    </div>
  );
}
