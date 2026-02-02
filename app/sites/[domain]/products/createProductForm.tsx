"use client";
import React, { useState, useEffect } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSellProductAction } from "./actions/create-item.action";
import { validation } from "@/validation/sellProducts/create";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2 } from "lucide-react";
import { SellProductCategory } from "@/types/supabase";
import { DocumentUpload } from "@/components/ui/document-upload";

type Props = {
  handleClose: any;
  domain: string;
  siteId: string;
};

const CreateProductForm = ({ handleClose, domain, siteId }: Props) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<SellProductCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      category: "",
      name: "",
      type: "",
      description: "",
      price_list: false,
      image_url: "",
      doc_url: "",
    },
  });

  // Carica categorie
  useEffect(() => {
    const loadData = async () => {
      setLoadingCategories(true);
      try {
        const catRes = await fetch(
          `/api/sell-products/categories?siteId=${siteId}`
        );
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (siteId) {
      loadData();
    }
  }, [siteId]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !siteId) return;

    setSavingCategory(true);
    try {
      const res = await fetch("/api/sell-products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          name: newCategoryName.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories((prev) =>
          [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name))
        );
        form.setValue("category", data.category.name);
        setNewCategoryName("");
        setShowAddCategory(false);
        toast({ description: "Categoria creata con successo!" });
      } else {
        const error = await res.json();
        toast({
          variant: "destructive",
          description: error.error || "Errore nella creazione della categoria",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore nella creazione della categoria",
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      await createSellProductAction(d, domain, siteId);
      handleClose(false);
      toast({
        description: `Prodotto "${d.name}" creato correttamente!`,
      });
      form.reset();
    } catch (e) {
      toast({
        description: `Errore nel creare il prodotto! ${e}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingCategories}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          loadingCategories
                            ? "Caricamento..."
                            : "Seleziona categoria"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <Dialog
                  open={showAddCategory}
                  onOpenChange={setShowAddCategory}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={loadingCategories}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Nuova Categoria</DialogTitle>
                      <DialogDescription>
                        Aggiungi una nuova categoria prodotto
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Input
                          placeholder="Nome categoria..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddCategory(false)}
                        >
                          Annulla
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddCategory}
                          disabled={!newCategoryName.trim() || savingCategory}
                        >
                          {savingCategory && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Aggiungi
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Prodotto</FormLabel>
              <FormControl>
                <Input placeholder="Armadio" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sottocategoria</FormLabel>
              <FormControl>
                <Input placeholder="(opzionale)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrizione del prodotto..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price_list"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Listino Prezzi</FormLabel>
                <FormDescription>
                  Includi questo prodotto nel listino prezzi
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Immagine</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription>
                Link all&apos;immagine del prodotto
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="doc_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheda Tecnica</FormLabel>
              <FormControl>
                <DocumentUpload
                  siteId={siteId}
                  folder="sell-products"
                  currentUrl={field.value || undefined}
                  onUploadComplete={(url) => field.onChange(url)}
                  onRemove={() => field.onChange("")}
                  onError={(error) => {
                    toast({
                      variant: "destructive",
                      description: error,
                    });
                  }}
                />
              </FormControl>
              <FormDescription>
                Carica la scheda tecnica del prodotto (PDF)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm mr-1"></span>
          )}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default CreateProductForm;
