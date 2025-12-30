"use client";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { usePathname } from "next/navigation";

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
import { editInventoryItemSchema, type EditInventoryItemInput } from "@/validation/inventory";
import { useToast } from "@/components/ui/use-toast";
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
import { InventoryCategory, InventorySupplier, InventoryUnit } from "@/types/supabase";

type Props = {
  handleClose: any;
  data: any; // The row data (flattened item+variant)
};

const EditProductForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const pathname = usePathname();
  const domain = pathname.split("/")[2] || "";

  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);

  const form = useForm<EditInventoryItemInput>({
    resolver: zodResolver(editInventoryItemSchema),
    defaultValues: {
      name: "",
      description: "",
      item_type: "",
      category_id: undefined,
      supplier_id: undefined,
      internal_code: "",
      supplier_code: "",
      producer: "",
      producer_code: "",
      unit_id: undefined,
      purchase_unit_price: null,
      sell_unit_price: null,
      image_url: "",
      url_tds: "",
      color: "",
      color_code: "",
      width: null,
      height: null,
      length: null,
      thickness: null,
      diameter: null,
      subcategory: "",
      subcategory_code: "",
      subcategory2: "",
      subcategory2_code: "",
    },
  });

  const { setValue } = form;
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (!domain) return;

    const fetchData = async () => {
      try {
        const [suppliersRes, categoriesRes, unitsRes] = await Promise.all([
          fetch(`/api/inventory/suppliers/`, {
            headers: { "x-site-domain": domain },
          }),
          fetch(`/api/inventory/categories/`, {
            headers: { "x-site-domain": domain },
          }),
          fetch(`/api/inventory/units/`),
        ]);

        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData);
        }
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }
        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setUnits(unitsData);
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    };

    fetchData();

    // Populate form with data
    setValue("name", data.name ?? "");
    setValue("description", data.description ?? "");
    setValue("item_type", data.item_type ?? "");
    setValue("category_id", data.category_id ?? undefined);
    setValue("supplier_id", data.supplier_id ?? undefined);
    
    // Variant fields
    setValue("internal_code", data.internal_code ?? "");
    setValue("supplier_code", data.supplier_code ?? "");
    setValue("producer", data.producer ?? "");
    setValue("producer_code", data.producer_code ?? "");
    setValue("unit_id", data.unit_id ?? undefined);
    setValue("purchase_unit_price", data.purchase_unit_price ?? data.unit_price ?? null);
    setValue("sell_unit_price", data.sell_unit_price ?? data.sell_price ?? null);
    setValue("image_url", data.image_url ?? "");
    setValue("url_tds", data.url_tds ?? "");

    // Attributes (could be in data directly or in data.attributes)
    const attrs = data.attributes || {};
    setValue("color", data.color ?? attrs.color ?? "");
    setValue("color_code", data.color_code ?? attrs.color_code ?? "");
    setValue("width", data.width ?? attrs.width ?? null);
    setValue("height", data.height ?? attrs.height ?? null);
    setValue("length", data.length ?? attrs.length ?? null);
    setValue("thickness", data.thickness ?? attrs.thickness ?? null);
    setValue("diameter", data.diameter ?? attrs.diameter ?? null);
    setValue("subcategory", data.subcategory ?? attrs.subcategory ?? "");
    setValue("subcategory_code", data.subcategory_code ?? attrs.subcategory_code ?? "");
    setValue("subcategory2", data.subcategory2 ?? attrs.subcategory2 ?? "");
    setValue("subcategory2_code", data.subcategory2_code ?? attrs.subcategory2_code ?? "");

  }, [data, setValue, domain]);

  const onSubmit: SubmitHandler<EditInventoryItemInput> = async (d) => {
    const formValues = form.getValues();
    const response = await editItem(formValues, data.item_id, data.variant_id);
    
    if (response?.error) {
      toast({
        variant: "destructive",
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
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.code && `[${cat.code}] `}
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
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornitore</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona fornitore..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
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
              name="item_type"
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
                <FormLabel>Descrizione</FormLabel>
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
                    <Input placeholder="es. LG_PA_MEL_9010" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unità di Misura</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona unità..." />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.code} - {unit.name}
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
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
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
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altezza</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
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
              name="length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lunghezza</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                        field.onChange(e.target.value ? Number(e.target.value) : null)
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
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Prices Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Prezzi
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="purchase_unit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo Acquisto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
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
              name="sell_unit_price"
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
                        field.onChange(e.target.value ? Number(e.target.value) : null)
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
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sottocategoria</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Pannelli" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="es. PA" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="es. Pannello melaminico" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="es. MEL" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="es. BIANCO" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="es. 9010" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="es. HERZOG-HELMIGER" {...field} value={field.value ?? ""} />
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
                        <Input placeholder="es. HEHE" {...field} value={field.value ?? ""} />
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
                      <Input placeholder="es. HEHE" {...field} value={field.value ?? ""} />
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
                      <Input type="url" placeholder="https://..." {...field} value={field.value ?? ""} />
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
                      <Input type="url" placeholder="https://..." {...field} value={field.value ?? ""} />
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
