"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  CalendarDays,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import {
  CONTATTO_TIPO_LABELS,
  CONTENUTO_STATO_LABELS,
  EVENTO_TIPO_LABELS,
  type ContattoTipo,
  type ContenutoStato,
} from "@/lib/campagna/config";
import type { CampagnaDashboardData } from "@/lib/campagna/server-data";

const CampagnaTicinoMap = dynamic(() => import("./CampagnaTicinoMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-xl border border-border bg-muted" />
  ),
});

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-CH", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CampagnaOverview({
  data,
  domain,
}: {
  data: CampagnaDashboardData;
  domain: string;
}) {
  const base = `/sites/${domain}`;
  const tipoOrder = Object.keys(CONTATTO_TIPO_LABELS) as ContattoTipo[];
  const statoOrder = Object.keys(CONTENUTO_STATO_LABELS) as ContenutoStato[];
  const topComuni = data.contattiPerComune.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* CRM */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CRM Contatti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">{data.totaleContatti}</div>
            <ul className="space-y-1 text-sm">
              {tipoOrder.map((tipo) => (
                <li key={tipo} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {CONTATTO_TIPO_LABELS[tipo]}
                  </span>
                  <span className="font-medium">
                    {data.contattiPerTipo[tipo]}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={`${base}/crm/contatti`}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Apri CRM
            </Link>
          </CardContent>
        </Card>

        {/* Contenuti */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contenuti</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">{data.totaleContenuti}</div>
            <ul className="space-y-1 text-sm">
              {statoOrder.map((stato) => (
                <li key={stato} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {CONTENUTO_STATO_LABELS[stato]}
                  </span>
                  <span className="font-medium">
                    {data.contenutiPerStato[stato]}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={`${base}/contenuti`}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Apri Contenuti
            </Link>
          </CardContent>
        </Card>

        {/* Calendario */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prossimi eventi
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.prossimiEventi.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun evento in programma.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.prossimiEventi.slice(0, 5).map((evento) => {
                  const isLegale = evento.tipo === "scadenza_legale";
                  return (
                    <li key={evento.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        {isLegale && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span className="font-medium">{evento.titolo}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(evento.data_inizio)}</span>
                        <Badge
                          variant={isLegale ? "destructive" : "secondary"}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {EVENTO_TIPO_LABELS[evento.tipo]}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href={`${base}/calendario`}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Apri Calendario
            </Link>
          </CardContent>
        </Card>

        {/* Analisi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Analisi per comune
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {topComuni.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun contatto con comune.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {topComuni.map((entry) => (
                  <li key={entry.comune} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {entry.comune}
                    </span>
                    <span className="font-medium">{entry.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`${base}/analisi`}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Apri Analisi
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Distribuzione contatti sul territorio (Ticino)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampagnaTicinoMap contattiPerComune={data.contattiPerComune} />
        </CardContent>
      </Card>
    </div>
  );
}
