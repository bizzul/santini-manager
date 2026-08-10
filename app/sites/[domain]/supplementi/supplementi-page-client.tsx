"use client";

import React from "react";
import { PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Layers, Plus, Pencil } from "lucide-react";
import type { Supplemento, SupplementoTipoCalcolo } from "@/types/supabase";
import { SupplementoDialog } from "./supplemento-dialog";
import { toggleSupplementoAttivoAction } from "./actions/supplementi.actions";

const TIPO_CALCOLO_LABELS: Record<SupplementoTipoCalcolo, string> = {
  fisso_chf: "Fisso CHF",
  percentuale: "Percentuale",
  per_mq: "Per mq",
  per_metro_lineare: "Per ml",
};

function formatValore(supplemento: Supplemento): string {
  if (supplemento.tipo_calcolo === "percentuale") {
    return `${supplemento.valore}%`;
  }
  return `CHF ${Number(supplemento.valore).toFixed(2)}`;
}

type Props = {
  supplementi: Supplemento[];
  domain: string;
  siteId: string;
  isAdmin: boolean;
};

export function SupplementiPageClient({
  supplementi,
  domain,
  siteId,
  isAdmin,
}: Props) {
  const { toast } = useToast();

  const handleToggle = async (supplemento: Supplemento, attivo: boolean) => {
    const response = await toggleSupplementoAttivoAction(
      supplemento.id,
      attivo,
      domain,
      siteId,
    );
    if (!response?.success) {
      toast({
        variant: "destructive",
        description: response?.error ?? "Aggiornamento stato non riuscito.",
      });
    }
  };

  const createTrigger = (
    <Button className="shrink-0 whitespace-nowrap">
      <Plus className="mr-2 h-4 w-4" />
      Aggiungi supplemento
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Supplementi"
        subtitle="Sovrapprezzi opzionali applicabili ai prodotti configurati"
        actions={
          isAdmin ? (
            <SupplementoDialog
              domain={domain}
              siteId={siteId}
              trigger={createTrigger}
            />
          ) : null
        }
      />
      <PageContent>
        {supplementi.length > 0 ? (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo calcolo</TableHead>
                  <TableHead className="text-right">Valore</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Stato</TableHead>
                  {isAdmin ? (
                    <TableHead className="text-right">Azioni</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplementi.map((supplemento) => (
                  <TableRow key={supplemento.id}>
                    <TableCell className="font-mono text-xs">
                      {supplemento.codice}
                    </TableCell>
                    <TableCell className="font-medium">
                      {supplemento.nome}
                    </TableCell>
                    <TableCell>
                      {TIPO_CALCOLO_LABELS[supplemento.tipo_calcolo]}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatValore(supplemento)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(supplemento.categorie ?? []).map((categoria) => (
                          <Badge key={categoria} variant="secondary">
                            {categoria === "tutte" ? "Tutte" : categoria}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Switch
                          checked={supplemento.attivo}
                          onCheckedChange={(value) =>
                            handleToggle(supplemento, value)
                          }
                          aria-label="Attiva o disattiva supplemento"
                        />
                      ) : (
                        <Badge
                          variant={
                            supplemento.attivo ? "success" : "secondary"
                          }
                        >
                          {supplemento.attivo ? "Attivo" : "Disattivo"}
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <SupplementoDialog
                          domain={domain}
                          siteId={siteId}
                          supplemento={supplemento}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Modifica</span>
                            </Button>
                          }
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title="Nessun supplemento configurato"
            description={
              isAdmin
                ? "Premi 'Aggiungi supplemento' per crearne uno."
                : "Non ci sono ancora supplementi disponibili."
            }
            action={
              isAdmin ? (
                <SupplementoDialog
                  domain={domain}
                  siteId={siteId}
                  trigger={createTrigger}
                />
              ) : undefined
            }
          />
        )}
      </PageContent>
    </>
  );
}
