"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CalendarIcon, FileEdit } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { cn } from "@/lib/utils";
import { Client, SellProduct } from "@/types/supabase";

// Validation schema for quick add form
const quickAddSchema = z.object({
  clientId: z.number({
    required_error: "Seleziona un cliente",
  }),
  productIds: z.array(z.number()).min(1, "Seleziona almeno un prodotto"),
  deliveryDate: z.date().optional().nullable(),
  other: z.string().optional(),
});

type QuickAddFormData = z.infer<typeof quickAddSchema>;

interface OfferQuickAddProps {
  clients: Client[];
  products: SellProduct[];
  kanbanId: number;
  onSuccess: () => void;
  onCancel: () => void;
  domain?: string;
}

export default function OfferQuickAdd({
  clients = [],
  products = [],
  kanbanId,
  onSuccess,
  onCancel,
  domain,
}: OfferQuickAddProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");

  // Ensure arrays are always safe
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const form = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      clientId: undefined,
      productIds: [],
      deliveryDate: null,
      other: "",
    },
  });

  // Generate code on mount
  const generateCode = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("kanbanId", String(kanbanId));

      const res = await fetch(`/api/tasks/generate-code?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGeneratedCode(data.code);
      }
    } catch (error) {
      console.error("Error generating code:", error);
    }
  }, [kanbanId]);

  useEffect(() => {
    generateCode();
  }, [generateCode]);

  const onSubmit = async (data: QuickAddFormData) => {
    try {
      setIsSubmitting(true);

      // Create task as draft
      const response = await fetch("/api/kanban/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unique_code: generatedCode,
          clientId: data.clientId,
          productId: data.productIds[0], // Primary product
          productIds: data.productIds, // All selected products
          deliveryDate: data.deliveryDate?.toISOString() || null,
          other: data.other || "",
          kanbanId: kanbanId,
          isDraft: true,
          // Set minimal required fields
          sellPrice: 0,
          task_type: "OFFERTA",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore nella creazione");
      }

      toast({
        title: "Richiesta offerta creata",
        description: `Bozza ${generatedCode} aggiunta in TODO`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error creating draft offer:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nella creazione della bozza",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FileEdit className="h-5 w-5" />
        <span className="text-sm">
          Crea una richiesta offerta rapida. Potrai completare i dettagli in seguito.
        </span>
      </div>

      {generatedCode && (
        <div className="bg-muted/50 rounded-lg p-3">
          <span className="text-sm text-muted-foreground">Codice: </span>
          <span className="font-mono font-medium">{generatedCode}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        "Cliente senza nome",
                    }))}
                    emptyMessage="Nessun cliente trovato."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="productIds"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prodotti *</FormLabel>
                <FormControl>
                  <ProductMultiSelect
                    products={safeProducts}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Seleziona prodotti..."
                    disabled={isSubmitting}
                    emptyMessage="Nessun prodotto trovato."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="deliveryDate"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data consegna prevista</FormLabel>
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
                          : "Seleziona una data"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="other"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Appunti veloci sulla richiesta..."
                    disabled={isSubmitting}
                    rows={3}
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
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                "Crea Bozza"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

