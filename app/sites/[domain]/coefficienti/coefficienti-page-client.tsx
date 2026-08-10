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
import { SlidersHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import type { ListinoCoefficiente, CoefficienteCategoria } from "@/types/supabase";
import { CoefficienteDialog } from "./coefficiente-dialog";
import {
  toggleCoefficienteAttivoAction,
  deleteCoefficienteAction,
} from "./actions/coefficienti.actions";

const CATEGORIA_LABELS: Record<CoefficienteCategoria, string> = {
  materiale_serramento: "Materiale serramento",
  vetro: "Vetro",
  materiale_porta: "Materiale porta",
  telaio: "Telaio",
  esecuzione_ante: "Esecuzione ante",
  tipo_cassone: "Tipo cassone",
};

type Props = {
  coefficienti: ListinoCoefficiente[];
  domain: string;
  siteId: string;
  isAdmin: boolean;
};

export function CoefficientiPageClient({
  coefficienti,
  domain,
  siteId,
  isAdmin,
}: Props) {
  const { toast } = useToast();

  const handleToggle = async (c: ListinoCoefficiente, attivo: boolean) => {
    const response = await toggleCoefficienteAttivoAction(
      c.id,
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

  const handleDelete = async (c: ListinoCoefficiente) => {
    if (!window.confirm(`Eliminare il coefficiente "${c.codice}"?`)) return;
    const response = await deleteCoefficienteAction(c.id, domain, siteId);
    if (!response?.success) {
      toast({
        variant: "destructive",
        description: response?.error ?? "Eliminazione non riuscita.",
      });
    }
  };

  const createTrigger = (
    <Button className="shrink-0 whitespace-nowrap">
      <Plus className="mr-2 h-4 w-4" />
      Aggiungi coefficiente
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Coefficienti"
        subtitle="Moltiplicatori di materiale, vetro e telaio applicati al prezzo base"
        actions={
          isAdmin ? (
            <CoefficienteDialog
              domain={domain}
              siteId={siteId}
              trigger={createTrigger}
            />
          ) : null
        }
      />
      <PageContent>
        {coefficienti.length > 0 ? (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Codice</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="text-right">Moltiplicatore</TableHead>
                  <TableHead>Stato</TableHead>
                  {isAdmin ? (
                    <TableHead className="text-right">Azioni</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {coefficienti.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORIA_LABELS[c.categoria] ?? c.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.codice}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.descrizione ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      x{Number(c.moltiplicatore)}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Switch
                          checked={c.attivo}
                          onCheckedChange={(value) => handleToggle(c, value)}
                          aria-label="Attiva o disattiva coefficiente"
                        />
                      ) : (
                        <Badge variant={c.attivo ? "success" : "secondary"}>
                          {c.attivo ? "Attivo" : "Disattivo"}
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <CoefficienteDialog
                            domain={domain}
                            siteId={siteId}
                            coefficiente={c}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Modifica</span>
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Elimina</span>
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={<SlidersHorizontal className="h-6 w-6" />}
            title="Nessun coefficiente configurato"
            description={
              isAdmin
                ? "Premi 'Aggiungi coefficiente' per crearne uno."
                : "Non ci sono ancora coefficienti disponibili."
            }
            action={
              isAdmin ? (
                <CoefficienteDialog
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
