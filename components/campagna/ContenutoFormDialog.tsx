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
  CONTENUTO_FORMATI,
  CONTENUTO_FORMATO_LABELS,
  CONTENUTO_STATI,
  CONTENUTO_STATO_LABELS,
  type CampagnaContenuto,
} from "@/lib/campagna/config";
import {
  contenutoSchema,
  type ContenutoFormData,
} from "@/validation/campagna/contenuto";
import {
  createContenuto,
  updateContenuto,
} from "@/app/sites/[domain]/contenuti/actions";

export default function ContenutoFormDialog({
  domain,
  contenuto,
  trigger,
}: {
  domain: string;
  contenuto?: CampagnaContenuto;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = Boolean(contenuto);

  const form = useForm<ContenutoFormData>({
    resolver: zodResolver(contenutoSchema),
    defaultValues: {
      titolo: contenuto?.titolo ?? "",
      formato: contenuto?.formato ?? undefined,
      stato: contenuto?.stato ?? "bozza",
      corpo_testo: contenuto?.corpo_testo ?? "",
      canale: contenuto?.canale ?? "",
      data_pubblicazione_prevista:
        contenuto?.data_pubblicazione_prevista?.slice(0, 10) ?? "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: ContenutoFormData) => {
    const result = isEdit
      ? await updateContenuto(domain, contenuto!.id, data)
      : await createContenuto(domain, data);

    if (result.success) {
      toast({
        description: isEdit ? "Contenuto aggiornato." : "Contenuto creato.",
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
            Nuovo contenuto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90%] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica contenuto" : "Nuovo contenuto"}
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
                name="formato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona formato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENUTO_FORMATI.map((f) => (
                          <SelectItem key={f} value={f}>
                            {CONTENUTO_FORMATO_LABELS[f]}
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
                        {CONTENUTO_STATI.map((s) => (
                          <SelectItem key={s} value={s}>
                            {CONTENUTO_STATO_LABELS[s]}
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
                name="canale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canale</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Es. Instagram, sito, stampa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_pubblicazione_prevista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pubblicazione prevista</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="corpo_testo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testo</FormLabel>
                  <FormControl>
                    <Textarea rows={6} {...field} value={field.value ?? ""} />
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
                  : "Crea contenuto"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
