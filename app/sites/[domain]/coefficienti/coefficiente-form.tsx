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
  COEFFICIENTE_CATEGORIE,
} from "@/validation/coefficienti/create";
import type { ListinoCoefficiente } from "@/types/supabase";
import {
  createCoefficienteAction,
  updateCoefficienteAction,
} from "./actions/coefficienti.actions";

const CATEGORIA_LABELS: Record<(typeof COEFFICIENTE_CATEGORIE)[number], string> =
  {
    materiale_serramento: "Materiale serramento",
    vetro: "Vetro",
    materiale_porta: "Materiale porta",
    telaio: "Telaio",
    esecuzione_ante: "Esecuzione ante",
    tipo_cassone: "Tipo cassone",
  };

type Props = {
  handleClose: () => void;
  domain: string;
  siteId: string;
  coefficiente?: ListinoCoefficiente;
};

export function CoefficienteForm({
  handleClose,
  domain,
  siteId,
  coefficiente,
}: Props) {
  const { toast } = useToast();
  const isEdit = Boolean(coefficiente);

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      categoria: coefficiente?.categoria ?? "materiale_serramento",
      codice: coefficiente?.codice ?? "",
      descrizione: coefficiente?.descrizione ?? "",
      moltiplicatore: coefficiente?.moltiplicatore ?? 1,
      attivo: coefficiente?.attivo ?? true,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (values) => {
    const response = isEdit
      ? await updateCoefficienteAction(coefficiente!.id, values, domain, siteId)
      : await createCoefficienteAction(values, domain, siteId);

    if (response?.success) {
      toast({
        description: isEdit
          ? `Coefficiente "${values.codice}" aggiornato.`
          : `Coefficiente "${values.codice}" creato.`,
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
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COEFFICIENTE_CATEGORIE.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORIA_LABELS[cat]}
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
            name="codice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice</FormLabel>
                <FormControl>
                  <Input placeholder="es. LEGNO_ROVERE" {...field} />
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
                  placeholder="Descrizione opzionale"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="moltiplicatore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Moltiplicatore</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="1.00"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Fattore applicato al prezzo base (es. 1.15 = +15%).
              </FormDescription>
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
                  I coefficienti disattivati non sono selezionabili nelle offerte.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
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
              "Crea coefficiente"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
