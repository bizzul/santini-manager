"use client";
import React, { useEffect, useState } from "react";
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
import { validation } from "@/validation/sellProducts/create";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { SellProduct, SellProductCategory, Supplier } from "@/types/supabase";
import { editSellProductAction } from "./actions/edit-item.action";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";
import { DocumentUpload } from "@/components/ui/document-upload";

type Props = {
  handleClose: any;
  data: SellProduct;
  domain?: string;
  siteId?: string;
};

const EditProductForm = ({ handleClose, data, domain, siteId }: Props) => {
  const { toast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<SellProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      category: "",
      subcategory: "",
      tipo: "",
      name: "",
      description: "",
      supplier_id: undefined,
      price_list: false,
      image_url: "",
      doc_url: "",
      active: true,
    },
  });

  const { isSubmitting } = form.formState;
  const resolvedCategory = Array.isArray(data.category)
    ? data.category[0]
    : data.category;
  const resolvedSubcategory = data.subcategory || data.type || "";
  const resolvedTipo = data.tipo || data.product_type || "";

  useEffect(() => {
    const loadData = async () => {
      if (!siteId) return;

      setLoadingCategories(true);
      setLoadingSuppliers(true);

      try {
        const [catRes, suppliersRes] = await Promise.all([
          fetch(`/api/sell-products/categories?siteId=${siteId}`),
          fetch("/api/suppliers", {
            headers: {
              "x-site-domain": domain || "",
            },
          }),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingCategories(false);
        setLoadingSuppliers(false);
      }
    };

    loadData();
  }, [siteId, domain]);

  useEffect(() => {
    form.reset({
      category: resolvedCategory?.name || "",
      subcategory: resolvedSubcategory,
      tipo: resolvedTipo,
      name: data.name || "",
      description: data.description || "",
      supplier_id: data.supplier_id ?? undefined,
      price_list: data.price_list ?? false,
      image_url: data.image_url || "",
      doc_url: data.doc_url || "",
      active: data.active ?? true,
    });
  }, [data, form, resolvedCategory?.name, resolvedSubcategory, resolvedTipo]);

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
        const resData = await res.json();
        setCategories((prev) =>
          [...prev, resData.category].sort((a, b) => a.name.localeCompare(b.name)),
        );
        form.setValue("category", resData.category.name);
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

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (values) => {
    const response = await editSellProductAction(values, data?.id, domain, siteId);
    if (response?.error) {
      toast({
        description: `Errore! ${response.error}`,
      });
      return;
    }

    handleClose(false);
    router.refresh();
    toast({
      description: `Prodotto "${values.name}" aggiornato correttamente!`,
    });
    form.reset();
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
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-white/20"
                              style={{ backgroundColor: cat.color || "#3B82F6" }}
                            />
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {field.value &&
                        !categories.find((category) => category.name === field.value) && (
                          <SelectItem value={field.value}>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-white/20"
                                style={{ backgroundColor: "#3B82F6" }}
                              />
                              <span>{field.value}</span>
                            </div>
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
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
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
          name="subcategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sottocategoria</FormLabel>
              <FormControl>
                <Input placeholder="Inserisci sottocategoria" {...field} />
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
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <Input placeholder="Inserisci tipo" {...field} />
              </FormControl>
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
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fornitore</FormLabel>
              <FormControl>
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(value) => field.onChange(Number(value))}
                  disabled={loadingSuppliers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingSuppliers
                          ? "Caricamento..."
                          : "Seleziona fornitore"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name || `Fornitore ${supplier.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Carica immagine</FormLabel>
              <FormControl>
                <DocumentUpload
                  siteId={siteId || ""}
                  folder="sell-products/images"
                  currentUrl={field.value || undefined}
                  onUploadComplete={(url) => field.onChange(url)}
                  onRemove={() => field.onChange("")}
                  onError={(error) => {
                    toast({
                      variant: "destructive",
                      description: error,
                    });
                  }}
                  disabled={!siteId}
                  accept="image/png,image/jpeg,image/webp"
                  maxSizeMB={10}
                  dropzoneLabel="Trascina un'immagine qui o clicca per selezionare"
                  dropzoneHint="PNG, JPG, WEBP - Max 10MB"
                />
              </FormControl>
              <FormDescription>
                Carica l&apos;immagine del prodotto
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
                  siteId={siteId || ""}
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
                  disabled={!siteId}
                />
              </FormControl>
              <FormDescription>
                Carica la scheda tecnica del prodotto (PDF)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
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
                  <FormDescription>Includi nel listino</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Attivo</FormLabel>
                  <FormDescription>Prodotto attivo</FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

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

export default EditProductForm;
