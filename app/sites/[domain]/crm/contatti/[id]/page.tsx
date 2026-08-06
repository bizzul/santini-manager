import { notFound } from "next/navigation";
import Link from "next/link";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireCampagnaContext } from "@/lib/campagna/guard";
import {
  fetchContatto,
  fetchInterazioniByContatto,
} from "@/lib/campagna/server-data";
import ContattoFormDialog from "@/components/campagna/ContattoFormDialog";
import AddInterazioneForm from "@/components/campagna/AddInterazioneForm";
import { Button } from "@/components/ui/button";
import {
  CONSENSO_BASE_LEGALE_LABELS,
  CONSENSO_STATO_LABELS,
  CONTATTO_TIPO_LABELS,
  INTERAZIONE_TIPO_LABELS,
  type InterazioneTipo,
} from "@/lib/campagna/config";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function ContattoDetailPage({
  params,
}: {
  params: Promise<{ domain: string; id: string }>;
}) {
  const { domain, id } = await params;
  const { siteId } = await requireCampagnaContext(domain);

  const contatto = await fetchContatto(siteId, id);
  if (!contatto) notFound();

  const interazioni = await fetchInterazioniByContatto(siteId, id);
  const fullName = [contatto.nome, contatto.cognome]
    .filter(Boolean)
    .join(" ");

  return (
    <PageLayout>
      <PageHeader
        title={fullName}
        subtitle={`${CONTATTO_TIPO_LABELS[contatto.tipo]}${
          contatto.comune ? ` · ${contatto.comune}` : ""
        }`}
        breadcrumbs={
          <Link
            href={`/sites/${domain}/crm/contatti`}
            className="hover:underline"
          >
            ← Contatti
          </Link>
        }
        actions={
          <ContattoFormDialog
            domain={domain}
            contatto={contatto}
            trigger={<Button variant="outline">Modifica</Button>}
          />
        }
      />
      <PageContent>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Anagrafica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Email" value={contatto.email} />
              <Row label="Telefono" value={contatto.telefono} />
              <Row label="Comune" value={contatto.comune} />
              <Row label="Fonte" value={contatto.fonte} />
              <div className="pt-2">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Consenso
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {CONSENSO_STATO_LABELS[contatto.consenso_stato]}
                  </Badge>
                  <Badge variant="outline">
                    {CONSENSO_BASE_LEGALE_LABELS[contatto.consenso_base_legale]}
                  </Badge>
                </div>
              </div>
              {contatto.note ? (
                <div className="pt-2">
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Note
                  </p>
                  <p className="whitespace-pre-wrap">{contatto.note}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <AddInterazioneForm domain={domain} contattoId={id} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Storico interazioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interazioni.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessuna interazione registrata.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {interazioni.map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {
                              INTERAZIONE_TIPO_LABELS[
                                i.tipo as InterazioneTipo
                              ]
                            }
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(i.data)}
                          </span>
                        </div>
                        {i.note ? (
                          <p className="text-sm whitespace-pre-wrap">
                            {i.note}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}
