"use client";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validation } from "@/validation/products/edit";
import { useToast } from "@/components/ui/use-toast";
import { useFormStatus } from "react-dom";
import { Product_category, Supplier } from "@/types/supabase";
import { editItem } from "./actions/edit-item.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Props = {
  handleClose: any;
  data: any;
};

const EditProductForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      supplierId: undefined,
      productCategoryId: undefined,
      type: "",
      description: "",
      width: 0,
      height: 0,
      length: 0,
      thickness: null,
      diameter: null,
      quantity: 0,
      unit_price: 0,
      sell_price: null,
      unit: "",
      // New fields
      category: "",
      category_code: "",
      subcategory: "",
      subcategory_code: "",
      subcategory2: "",
      subcategory2_code: "",
      color: "",
      color_code: "",
      internal_code: "",
      warehouse_number: "",
      supplier_code: "",
      producer: "",
      producer_code: "",
      url_tds: "",
      image_url: "",
    },
  });
  const { setValue } = form;
  const { isSubmitting, errors } = form.formState;
  const { pending } = useFormStatus();

  const [categories, setCategories] = useState<Product_category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const getSuppliers = async () => {
      try {
        const response = await fetch(`/api/inventory/suppliers/`);
        if (!response.ok) {
          console.error("Failed to fetch suppliers");
          return;
        }
        const suppliers = await response.json();
        setSuppliers(suppliers);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };

    const getCategories = async () => {
      try {
        const response = await fetch(`/api/inventory/categories/`);
        if (!response.ok) {
          console.error("Failed to fetch categories");
          return;
        }
        const categories = await response.json();
        setCategories(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    // Set base fields
    setValue("name", data.name ?? "");
    setValue("type", data.type ?? "");
    setValue("description", data.description ?? "");
    setValue("width", data.width ?? 0);
    setValue("height", data.height ?? 0);
    setValue("length", data.length ?? 0);
    setValue("thickness", data.thickness ?? null);
    setValue("diameter", data.diameter ?? null);
    setValue("quantity", data.quantity ?? 0);
    setValue("unit_price", data.unit_price ?? 0);
    setValue("sell_price", data.sell_price ?? null);
    setValue("unit", data.unit ?? "");
    setValue("supplierId", data.supplierId ?? data.supplier_id);
    setValue("productCategoryId", data.categoryId ?? data.product_category_id);

    // Set new inventory fields
    setValue("category", data.category ?? "");
    setValue("category_code", data.category_code ?? "");
    setValue("subcategory", data.subcategory ?? "");
    setValue("subcategory_code", data.subcategory_code ?? "");
    setValue("subcategory2", data.subcategory2 ?? "");
    setValue("subcategory2_code", data.subcategory2_code ?? "");
    setValue("color", data.color ?? "");
    setValue("color_code", data.color_code ?? "");
    setValue("internal_code", data.internal_code ?? "");
    setValue("warehouse_number", data.warehouse_number ?? "");
    setValue("supplier_code", data.supplier_code ?? "");
    setValue("producer", data.producer ?? "");
    setValue("producer_code", data.producer_code ?? "");
    setValue("url_tds", data.url_tds ?? "");
    setValue("image_url", data.image_url ?? "");

    getSuppliers();
    getCategories();
  }, [data, setValue]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    const response = await editItem(d, data?.id);
    if (response?.error) {
      toast({
        description: `Errore! ${response.error}`,
      });
    } else {
      handleClose(false);
      toast({
        description: `Elemento ${d.name} aggiornato correttamente!`,
      });
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Informazioni Base
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="productCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria DB</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: Product_category) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
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
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornitore</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona fornitore" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((sup: Supplier) => (
                          <SelectItem key={sup.id} value={sup.id.toString()}>
                            {sup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrizione / N. Articolo</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Codes Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Codici</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="internal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice Interno</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="es. LG_PA_MEL_9010"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="warehouse_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nr. Magazzino</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="es. 1000"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Dimensions Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Dimensioni
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Larghezza</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? 0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altezza</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? 0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lunghezza</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? 0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="thickness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spessore</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="diameter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diametro</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Quantity & Price Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Quantità e Prezzi
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qta.</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? 0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unità</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PZ, ML, KG..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="unit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo Acquisto</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="sell_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo Vendita</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Advanced Fields Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="category-hierarchy">
            <AccordionTrigger className="text-sm">
              Gerarchia Categorie (opzionale)
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. LEGNO"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="category_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Categoria</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. LG"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sottocategoria</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. Pannelli"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="subcategory_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Sottocategoria</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. PA"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="subcategory2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sottocategoria 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. Pannello melaminico"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="subcategory2_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Sottocategoria 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. MEL"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="color">
            <AccordionTrigger className="text-sm">
              Colore (opzionale)
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colore</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. BIANCO"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="color_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Colore</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. 9010"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="producer">
            <AccordionTrigger className="text-sm">
              Produttore (opzionale)
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="producer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produttore</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. HERZOG-HELMIGER"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={isSubmitting}
                  control={form.control}
                  name="producer_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Produttore</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="es. HEHE"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                disabled={isSubmitting}
                control={form.control}
                name="supplier_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fornitore</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="es. HEHE"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="urls">
            <AccordionTrigger className="text-sm">
              URL e Immagini (opzionale)
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <FormField
                disabled={isSubmitting}
                control={form.control}
                name="url_tds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Scheda Tecnica</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isSubmitting}
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Immagine</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
