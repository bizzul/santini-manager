"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import {
  validation,
  SUPPLEMENTO_CATEGORIE,
  SUPPLEMENTO_TIPI_CALCOLO,
} from "@/validation/supplementi/create";
import type { Supplemento } from "@/types/supabase";
import {
  createSupplementoAction,
  updateSupplementoAction,
} from "./actions/supplementi.actions";

const TIPO_CALCOLO_LABELS: Record<
  (typeof SUPPLEMENTO_TIPI_CALCOLO)[number],
  string
> = {
  fisso_chf: "Importo fisso (CHF)",
  percentuale: "Percentuale (%)",
  per_mq: "Per metro quadro",
  per_metro_lineare: "Per metro lineare",
};

type Props = {
  handleClose: () => void;
  domain: string;
  siteId: string;
  supplemento?: Supplemento;
};

export function SupplementoForm({
  handleClose,
  domain,
  siteId,
  supplemento,
}: Props) {
  const { toast } = useToast();
  const isEdit = Boolean(supplemento);

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      codice: supplemento?.codice ?? "",
      nome: supplemento?.nome ?? "",
      descrizione: supplemento?.descrizione ?? "",
      tipo_calcolo: supplemento?.tipo_calcolo ?? "fisso_chf",
      valore: supplemento?.valore ?? 0,
      categorie: supplemento?.categorie ?? [],
      attivo: supplemento?.attivo ?? true,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (values) => {
    const response = isEdit
      ? await updateSupplementoAction(supplemento!.id, values, domain, siteId)
      : await createSupplementoAction(values, domain, siteId);

    if (response?.success) {
      toast({
        description: isEdit
          ? `Supplemento "${values.nome}" aggiornato.`
          : `Supplemento "${values.nome}" creato.`,
      });
      form.reset();
      handleClose();
      return;
    }

    toast({
      variant: "destructive",
      description:
        typeof response?.error === "string"
          ? response.error
          : "Operazione non riuscita. Controlla i campi e riprova.",
    });
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="codice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice</FormLabel>
                <FormControl>
                  <Input placeholder="es. RAL_COLORE" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="es. Colore RAL a scelta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descrizione"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrizione opzionale del supplemento"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tipo_calcolo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo di calcolo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUPPLEMENTO_TIPI_CALCOLO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {TIPO_CALCOLO_LABELS[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valore</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  CHF per importi fissi, % per percentuali.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categorie"
          render={() => (
            <FormItem>
              <FormLabel>Categorie applicabili</FormLabel>
              <FormDescription>
                Seleziona le categorie prodotto a cui si applica.
              </FormDescription>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SUPPLEMENTO_CATEGORIE.map((categoria) => (
                  <FormField
                    key={categoria}
                    control={form.control}
                    name="categorie"
                    render={({ field }) => {
                      const checked = field.value?.includes(categoria);
                      return (
                        <FormItem
                          key={categoria}
                          className="flex flex-row items-center gap-2 space-y-0 rounded-md border p-2"
                        >
                          <FormControl>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                const current = field.value ?? [];
                                if (value) {
                                  field.onChange([...current, categoria]);
                                } else {
                                  field.onChange(
                                    current.filter((c) => c !== categoria),
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {categoria === "tutte" ? "Tutte" : categoria}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attivo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Attivo</FormLabel>
                <FormDescription>
                  I supplementi disattivati non sono selezionabili nelle offerte.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Salva modifiche"
            ) : (
              "Crea supplemento"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
