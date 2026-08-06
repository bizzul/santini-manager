import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCampagnaContext } from "@/lib/campagna/guard";
import { fetchCampagnaDashboardData } from "@/lib/campagna/server-data";
import {
  CONTATTO_TIPO_LABELS,
  CONTENUTO_STATO_LABELS,
  type ContattoTipo,
  type ContenutoStato,
} from "@/lib/campagna/config";

export const metadata = { title: "Analisi" };

export default async function AnalisiPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const { siteId } = await requireCampagnaContext(domain);
  const data = await fetchCampagnaDashboardData(siteId);

  const tipoOrder = Object.keys(CONTATTO_TIPO_LABELS) as ContattoTipo[];
  const statoOrder = Object.keys(CONTENUTO_STATO_LABELS) as ContenutoStato[];
  const maxComune = data.contattiPerComune.reduce(
    (max, e) => Math.max(max, e.count),
    0,
  );

  return (
    <PageLayout>
      <PageHeader
        title="Analisi"
        subtitle="Metriche di sintesi e ripartizione per comune (dati aggregati)"
      />
      <PageContent>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Contatti totali" value={data.totaleContatti} />
            <MetricCard
              label="Contenuti totali"
              value={data.totaleContenuti}
            />
            <MetricCard
              label="Comuni coperti"
              value={data.contattiPerComune.length}
            />
            <MetricCard
              label="Eventi in programma"
              value={data.prossimiEventi.length}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contatti per tipo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tipoOrder.map((tipo) => (
                  <BreakdownRow
                    key={tipo}
                    label={CONTATTO_TIPO_LABELS[tipo]}
                    value={data.contattiPerTipo[tipo]}
                    total={data.totaleContatti}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contenuti per stato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statoOrder.map((stato) => (
                  <BreakdownRow
                    key={stato}
                    label={CONTENUTO_STATO_LABELS[stato]}
                    value={data.contenutiPerStato[stato]}
                    total={data.totaleContenuti}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ripartizione contatti per comune
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.contattiPerComune.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessun contatto con comune registrato.
                </p>
              ) : (
                data.contattiPerComune.map((entry) => (
                  <BreakdownRow
                    key={entry.comune}
                    label={entry.comune}
                    value={entry.count}
                    total={maxComune}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
