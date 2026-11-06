"use client";

import type { UseFormReturn } from "react-hook-form";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Condizioni commerciali del documento.
 *
 * Compare due volte nel wizard, ed e' voluto: al passo 3 si impostano prima
 * di elaborare l'offerta, al passo 4 restano modificabili accanto
 * all'anteprima, dove si vede l'effetto sul documento.
 */

interface CondizioniStepProps {
  form: UseFormReturn<DocumentoArricchito>;
}

export function CondizioniStep({ form }: CondizioniStepProps) {
  return (
              <div className="grid gap-2 rounded-md border border-border/70 bg-muted/10 p-2 md:grid-cols-2">
    <p className="text-sm font-medium md:col-span-2">Condizioni e note</p>
    <FormField
      control={form.control}
      name="condizioniPagamento"
      render={({ field }) => (
        <FormItem className="space-y-0 md:col-span-2">
          <FormLabel className="text-[11px]">
            Condizioni di pagamento
          </FormLabel>
          <FormControl>
            <Textarea
              rows={2}
              className="text-sm"
              value={(field.value ?? []).join("\n")}
              onChange={(e) =>
                field.onChange(
                  e.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                )
              }
              placeholder="Una condizione per riga"
            />
          </FormControl>
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="termineFornitura"
      render={({ field }) => (
        <FormItem className="space-y-0">
          <FormLabel className="text-[11px]">Termine di fornitura</FormLabel>
          <FormControl>
            <Input
              className="h-8 text-sm"
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="note"
      render={({ field }) => (
        <FormItem className="space-y-0">
          <FormLabel className="text-[11px]">Note / trasporto</FormLabel>
          <FormControl>
            <Textarea
              rows={2}
              className="min-h-[2.25rem] resize-y text-sm"
              {...field}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
              placeholder="Note aggiuntive…"
            />
          </FormControl>
        </FormItem>
      )}
    />
              </div>
  );
}
