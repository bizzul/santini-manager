"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Product_category } from "@/types/supabase";
import { Plus } from "lucide-react";
import * as z from "zod";
import { createItem } from "@/app/sites/[domain]/categories/actions/create-item.action";

const categoryValidation = z.object({
  name: z.string().min(1, "Nome richiesto"),
  code: z.string().optional(),
  description: z.string().optional(),
});

type CategorySelectorProps = {
  categories: Product_category[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  domain: string;
  onCategoryCreated?: (category: Product_category) => void;
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories: initialCategories,
  value,
  onValueChange,
  disabled,
  domain,
  onCategoryCreated,
}) => {
  const [categories, setCategories] =
    useState<Product_category[]>(initialCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categoryValidation>>({
    resolver: zodResolver(categoryValidation),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const { isSubmitting } = form.formState;

  // Update categories when initialCategories changes
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const refreshCategories = async () => {
    try {
      const response = await fetch(`/api/inventory/categories/`, {
        headers: {
          "x-site-domain": domain,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error refreshing categories:", error);
    }
  };

  const onSubmit = async (data: z.infer<typeof categoryValidation>) => {
    try {
      const result = await createItem(
        {
          name: data.name,
          code: data.code || "",
          description: data.description || "",
        },
        domain
      );

      if (result.success && result.data) {
        toast({
          description: `Categoria "${data.name}" creata correttamente!`,
        });

        // Refresh categories list
        await refreshCategories();

        // Select the newly created category
        onValueChange(result.data.id.toString());

        // Notify parent component
        if (onCategoryCreated) {
          onCategoryCreated(result.data);
        }

        // Close dialog and reset form
        setIsDialogOpen(false);
        form.reset();
      } else {
        toast({
          description: result.message || "Errore nel creare la categoria",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        description: `Errore nel creare la categoria: ${error}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Select
        onValueChange={onValueChange}
        value={value?.toString()}
        disabled={disabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Seleziona categoria..." />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat: Product_category) => (
            <SelectItem key={cat.id} value={cat.id.toString()}>
              {cat.code && `[${cat.code}] `}
              {cat.name}
              {cat.description && ` - ${cat.description}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
        title="Crea nuova categoria"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuova categoria inventario</DialogTitle>
            <DialogDescription>
              Crea una nuova categoria per i prodotti dell'inventario
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isSubmitting}
                          placeholder="es. Legno"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isSubmitting}
                          placeholder="es. LG"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione (opzionale)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isSubmitting}
                        placeholder="es. Viti, bulloni, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    form.reset();
                  }}
                  disabled={isSubmitting}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creazione..." : "Crea categoria"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategorySelector;
