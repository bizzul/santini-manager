"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  CONSENSO_BASE_LEGALE_LABELS,
  CONSENSO_BASI_LEGALI,
  CONSENSO_STATI,
  CONSENSO_STATO_LABELS,
  CONTATTO_TIPI,
  CONTATTO_TIPO_LABELS,
  type CampagnaContatto,
} from "@/lib/campagna/config";
import {
  contattoSchema,
  type ContattoFormData,
} from "@/validation/campagna/contatto";
import { createContatto, updateContatto } from "@/app/sites/[domain]/crm/contatti/actions";

interface ContattoFormDialogProps {
  domain: string;
  contatto?: CampagnaContatto;
  trigger?: React.ReactNode;
}

export default function ContattoFormDialog({
  domain,
  contatto,
  trigger,
}: ContattoFormDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = Boolean(contatto);

  const form = useForm<ContattoFormData>({
    resolver: zodResolver(contattoSchema),
    defaultValues: {
      nome: contatto?.nome ?? "",
      cognome: contatto?.cognome ?? "",
      comune: contatto?.comune ?? "",
      email: contatto?.email ?? "",
      telefono: contatto?.telefono ?? "",
      tipo: contatto?.tipo ?? undefined,
      fonte: contatto?.fonte ?? "",
      note: contatto?.note ?? "",
      consenso_stato: contatto?.consenso_stato ?? undefined,
      consenso_base_legale: contatto?.consenso_base_legale ?? undefined,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: ContattoFormData) => {
    const result = isEdit
      ? await updateContatto(domain, contatto!.id, data)
      : await createContatto(domain, data);

    if (result.success) {
      toast({
        description: isEdit
          ? "Contatto aggiornato."
          : "Contatto creato con successo.",
      });
      setOpen(false);
      if (!isEdit) form.reset();
      router.refresh();
    } else {
      toast({ variant: "destructive", description: result.error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="shrink-0">
            Aggiungi contatto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90%] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica contatto" : "Nuovo contatto"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cognome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comune"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comune</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTATTO_TIPI.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {CONTATTO_TIPO_LABELS[tipo]}
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="mb-3 text-sm font-medium">
                Consenso al trattamento dati (obbligatorio)
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="consenso_stato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato consenso *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona stato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONSENSO_STATI.map((stato) => (
                            <SelectItem key={stato} value={stato}>
                              {CONSENSO_STATO_LABELS[stato]}
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
                  name="consenso_base_legale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base legale *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona base legale" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONSENSO_BASI_LEGALI.map((base) => (
                            <SelectItem key={base} value={base}>
                              {CONSENSO_BASE_LEGALE_LABELS[base]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription className="mt-2">
                Le opinioni politiche sono dati degni di particolare protezione
                (LPD): senza consenso e base legale il contatto non puo essere
                salvato.
              </FormDescription>
            </div>

            <FormField
              control={form.control}
              name="fonte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting
                ? "Salvataggio..."
                : isEdit
                  ? "Salva modifiche"
                  : "Crea contatto"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
