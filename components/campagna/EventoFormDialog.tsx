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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  EVENTO_STATI,
  EVENTO_STATO_LABELS,
  EVENTO_TIPI,
  EVENTO_TIPO_LABELS,
  type CampagnaEvento,
} from "@/lib/campagna/config";
import { eventoSchema, type EventoFormData } from "@/validation/campagna/evento";
import {
  createEvento,
  updateEvento,
} from "@/app/sites/[domain]/calendario/actions";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function EventoFormDialog({
  domain,
  evento,
  trigger,
}: {
  domain: string;
  evento?: CampagnaEvento;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = Boolean(evento);

  const form = useForm<EventoFormData>({
    resolver: zodResolver(eventoSchema),
    defaultValues: {
      titolo: evento?.titolo ?? "",
      tipo: evento?.tipo ?? undefined,
      stato: evento?.stato ?? "pianificato",
      data_inizio: toLocalInput(evento?.data_inizio),
      data_fine: toLocalInput(evento?.data_fine),
      luogo: evento?.luogo ?? "",
      comune: evento?.comune ?? "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: EventoFormData) => {
    const payload = {
      ...data,
      data_inizio: new Date(data.data_inizio).toISOString(),
      data_fine: data.data_fine
        ? new Date(data.data_fine).toISOString()
        : "",
    };
    const result = isEdit
      ? await updateEvento(domain, evento!.id, payload)
      : await createEvento(domain, payload);

    if (result.success) {
      toast({ description: isEdit ? "Evento aggiornato." : "Evento creato." });
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
            Nuovo evento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90%] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica evento" : "Nuovo evento"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titolo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENTO_TIPI.map((t) => (
                          <SelectItem key={t} value={t}>
                            {EVENTO_TIPO_LABELS[t]}
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
                name="stato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENTO_STATI.map((s) => (
                          <SelectItem key={s} value={s}>
                            {EVENTO_STATO_LABELS[s]}
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
                name="data_inizio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inizio *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_fine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fine</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
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
                name="luogo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Luogo</FormLabel>
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
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting
                ? "Salvataggio..."
                : isEdit
                  ? "Salva modifiche"
                  : "Crea evento"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
