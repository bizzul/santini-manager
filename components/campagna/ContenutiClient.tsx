"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import { FileText } from "lucide-react";
import ContenutoFormDialog from "./ContenutoFormDialog";
import {
  CONTENUTO_FORMATI,
  CONTENUTO_FORMATO_LABELS,
  CONTENUTO_STATI,
  CONTENUTO_STATO_LABELS,
  type CampagnaContenuto,
  type ContenutoStato,
} from "@/lib/campagna/config";

const STATO_BADGE: Record<
  ContenutoStato,
  "default" | "secondary" | "destructive" | "outline"
> = {
  bozza: "outline",
  revisione: "secondary",
  approvato: "default",
  pubblicato: "default",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-CH");
  } catch {
    return iso;
  }
}

export default function ContenutiClient({
  contenuti,
  domain,
}: {
  contenuti: CampagnaContenuto[];
  domain: string;
}) {
  const [formato, setFormato] = useState("all");
  const [stato, setStato] = useState("all");

  const filtered = useMemo(() => {
    return contenuti.filter((c) => {
      if (formato !== "all" && c.formato !== formato) return false;
      if (stato !== "all" && c.stato !== stato) return false;
      return true;
    });
  }, [contenuti, formato, stato]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={formato} onValueChange={setFormato}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ogni formato</SelectItem>
            {CONTENUTO_FORMATI.map((f) => (
              <SelectItem key={f} value={f}>
                {CONTENUTO_FORMATO_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stato} onValueChange={setStato}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ogni stato</SelectItem>
            {CONTENUTO_STATI.map((s) => (
              <SelectItem key={s} value={s}>
                {CONTENUTO_STATO_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} / {contenuti.length} contenuti
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Nessun contenuto"
          description="Crea un contenuto o modifica i filtri."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ContenutoFormDialog
              key={c.id}
              domain={domain}
              contenuto={c}
              trigger={
                <button
                  type="button"
                  className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                >
                  <Card className="h-full transition-colors hover:bg-surface">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-medium">
                          {c.titolo}
                        </CardTitle>
                        <Badge variant={STATO_BADGE[c.stato]}>
                          {CONTENUTO_STATO_LABELS[c.stato]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {CONTENUTO_FORMATO_LABELS[c.formato]}
                        </Badge>
                        {c.canale ? <span>{c.canale}</span> : null}
                      </div>
                      {c.corpo_testo ? (
                        <p className="line-clamp-3">{c.corpo_testo}</p>
                      ) : null}
                      <p className="text-xs">
                        Pubblicazione:{" "}
                        {formatDate(c.data_pubblicazione_prevista)}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
