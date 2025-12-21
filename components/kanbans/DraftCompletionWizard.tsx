"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CalendarIcon, RefreshCw, FileCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { SearchSelect } from "@/components/ui/search-select";
import { ProductMultiSelect } from "@/components/ui/product-multi-select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Client, SellProduct, Task } from "@/types/supabase";

// Validation schema for completing a draft
const completionSchema = z.object({
  unique_code: z.string().min(1, "Codice obbligatorio"),
  clientId: z.number({
    required_error: "Seleziona un cliente",
  }),
  productId: z.number({
    required_error: "Seleziona un prodotto principale",
  }),
  deliveryDate: z.date().optional().nullable(),
  termine_produzione: z.date().optional().nullable(),
  sellPrice: z.number().min(0, "Inserisci un prezzo valido"),
  other: z.string().optional(),
  position1: z.string().optional(),
  position2: z.string().optional(),
  position3: z.string().optional(),
  position4: z.string().optional(),
  position5: z.string().optional(),
  position6: z.string().optional(),
  position7: z.string().optional(),
  position8: z.string().optional(),
});

type CompletionFormData = z.infer<typeof completionSchema>;

interface DraftCompletionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  clients: Client[];
  products: SellProduct[];
  targetColumnId: number;
  targetColumnIdentifier: string;
  onComplete: (taskId: number, columnId: number, columnIdentifier: string) => Promise<void>;
  domain?: string;
}

export default function DraftCompletionWizard({
  open,
  onOpenChange,
  task,
  clients = [],
  products = [],
  targetColumnId,
  targetColumnIdentifier,
  onComplete,
  domain,
}: DraftCompletionWizardProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  // Ensure arrays are always safe
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const form = useForm<CompletionFormData>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      unique_code: "",
      clientId: undefined,
      productId: undefined,
      deliveryDate: null,
      termine_produzione: null,
      sellPrice: 0,
      other: "",
      position1: "",
      position2: "",
      position3: "",
      position4: "",
      position5: "",
      position6: "",
      position7: "",
      position8: "",
    },
  });

  // Populate form with existing task data
  useEffect(() => {
    if (task && open) {
      form.reset({
        unique_code: task.unique_code || "",
        clientId: task.clientId || task.client_id,
        productId: task.sellProductId || task.sell_product_id,
        deliveryDate: task.deliveryDate ? new Date(task.deliveryDate) : null,
        sellPrice: task.sellPrice || 0,
        other: task.other || "",
        position1: task.positions?.[0] || "",
        position2: task.positions?.[1] || "",
        position3: task.positions?.[2] || "",
        position4: task.positions?.[3] || "",
        position5: task.positions?.[4] || "",
        position6: task.positions?.[5] || "",
        position7: task.positions?.[6] || "",
        position8: task.positions?.[7] || "",
      });
    }
  }, [task, open, form]);

  // Generate new code if needed
  const generateCode = useCallback(async () => {
    if (!task?.kanbanId && !task?.kanban_id) return;

    setIsLoadingCode(true);
    try {
      const params = new URLSearchParams();
      params.set("kanbanId", String(task.kanbanId || task.kanban_id));

      const res = await fetch(`/api/tasks/generate-code?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        form.setValue("unique_code", data.code);
      }
    } catch (error) {
      console.error("Error generating code:", error);
    } finally {
      setIsLoadingCode(false);
    }
  }, [task, form]);

  const onSubmit = async (data: CompletionFormData) => {
    if (!task) return;

    try {
      setIsSubmitting(true);

      // Prepare positions array
      const positions = [
        data.position1 || "",
        data.position2 || "",
        data.position3 || "",
        data.position4 || "",
        data.position5 || "",
        data.position6 || "",
        data.position7 || "",
        data.position8 || "",
      ];

      // Update the task with complete data and remove draft flag
      const response = await fetch(`/api/kanban/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unique_code: data.unique_code,
          clientId: data.clientId,
          sellProductId: data.productId,
          deliveryDate: data.deliveryDate?.toISOString() || null,
          termine_produzione: data.termine_produzione?.toISOString() || null,
          sellPrice: data.sellPrice,
          other: data.other,
          positions: positions,
          is_draft: false, // Remove draft flag
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore nell'aggiornamento");
      }

      toast({
        title: "Offerta completata",
        description: `Offerta ${data.unique_code} completata e spostata`,
      });

      // Close dialog and proceed with move
      onOpenChange(false);
      await onComplete(task.id, targetColumnId, targetColumnIdentifier);
    } catch (error: any) {
      console.error("Error completing draft:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nel completamento dell'offerta",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Completa Offerta
          </DialogTitle>
          <DialogDescription>
            Questa è una bozza. Completa i dettagli prima di spostarla.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">Bozza</Badge>
          <span className="text-sm text-muted-foreground">→</span>
          <Badge>{targetColumnIdentifier}</Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Code */}
            <FormField
              control={form.control}
              name="unique_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice Identificativo</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          {...field}
                          disabled={isSubmitting || isLoadingCode}
                        />
                        {isLoadingCode && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateCode}
                        disabled={isSubmitting || isLoadingCode}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingCode ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client */}
            <FormField
              name="clientId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value}
                      onValueChange={(value) => field.onChange(Number(value))}
                      placeholder="Cerca cliente..."
                      disabled={isSubmitting}
                      options={safeClients.map((client) => ({
                        value: client.id,
                        label:
                          client.businessName ||
                          `${client.individualFirstName || ""} ${client.individualLastName || ""}`.trim() ||
                          "Cliente",
                      }))}
                      emptyMessage="Nessun cliente trovato."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product */}
            <FormField
              name="productId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prodotto *</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value}
                      onValueChange={(value) => field.onChange(Number(value))}
                      placeholder="Cerca prodotto..."
                      disabled={isSubmitting}
                      options={safeProducts.map((p) => ({
                        value: p.id,
                        label: `${p.name}${p.type ? ` - ${p.type}` : ""}`,
                      }))}
                      emptyMessage="Nessun prodotto trovato."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="termine_produzione"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Termine produzione</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value
                              ? field.value.toLocaleDateString("it-IT")
                              : "Seleziona data"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="deliveryDate"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data consegna</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value
                              ? field.value.toLocaleDateString("it-IT")
                              : "Seleziona data"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price */}
            <FormField
              name="sellPrice"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valore offerta (€)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Positions */}
            <div>
              <FormLabel>Posizioni</FormLabel>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <FormField
                    key={i}
                    name={`position${i}` as keyof CompletionFormData}
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={`Pos. ${i}`}
                            value={String(field.value || "")}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <FormField
              name="other"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Note aggiuntive..."
                      disabled={isSubmitting}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Completa e Sposta"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

