"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import { Users } from "lucide-react";
import ContattoFormDialog from "./ContattoFormDialog";
import {
  CONSENSO_STATI,
  CONSENSO_STATO_LABELS,
  CONTATTO_TIPI,
  CONTATTO_TIPO_LABELS,
  type ConsensoStato,
} from "@/lib/campagna/config";
import type { ContattoWithLastInteraction } from "@/lib/campagna/server-data";

const CONSENSO_BADGE: Record<
  ConsensoStato,
  "default" | "secondary" | "destructive" | "outline"
> = {
  concesso: "default",
  richiesto: "secondary",
  negato: "destructive",
  revocato: "outline",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ContattiClient({
  contatti,
  domain,
}: {
  contatti: ContattoWithLastInteraction[];
  domain: string;
}) {
  const [comune, setComune] = useState("");
  const [tipo, setTipo] = useState<string>("all");
  const [consenso, setConsenso] = useState<string>("all");

  const filtered = useMemo(() => {
    return contatti.filter((c) => {
      if (
        comune &&
        !(c.comune ?? "").toLowerCase().includes(comune.toLowerCase())
      ) {
        return false;
      }
      if (tipo !== "all" && c.tipo !== tipo) return false;
      if (consenso !== "all" && c.consenso_stato !== consenso) return false;
      return true;
    });
  }, [contatti, comune, tipo, consenso]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filtra per comune"
          value={comune}
          onChange={(e) => setComune(e.target.value)}
          className="w-48"
        />
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {CONTATTO_TIPI.map((t) => (
              <SelectItem key={t} value={t}>
                {CONTATTO_TIPO_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={consenso} onValueChange={setConsenso}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Consenso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ogni consenso</SelectItem>
            {CONSENSO_STATI.map((s) => (
              <SelectItem key={s} value={s}>
                {CONSENSO_STATO_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} / {contatti.length} contatti
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Nessun contatto"
          description="Nessun contatto corrisponde ai filtri selezionati."
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Comune</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ultima interazione</TableHead>
                <TableHead>Consenso</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/sites/${domain}/crm/contatti/${c.id}`}
                      className="hover:underline"
                    >
                      {[c.nome, c.cognome].filter(Boolean).join(" ")}
                    </Link>
                  </TableCell>
                  <TableCell>{c.comune ?? "—"}</TableCell>
                  <TableCell>{CONTATTO_TIPO_LABELS[c.tipo]}</TableCell>
                  <TableCell>{formatDate(c.ultima_interazione)}</TableCell>
                  <TableCell>
                    <Badge variant={CONSENSO_BADGE[c.consenso_stato]}>
                      {CONSENSO_STATO_LABELS[c.consenso_stato]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ContattoFormDialog
                      domain={domain}
                      contatto={c}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Modifica
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
