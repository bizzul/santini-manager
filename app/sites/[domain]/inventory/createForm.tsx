"use client";
import React, { useState, useEffect } from "react";
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
import { createItem } from "./actions/create-item.action";
import { createInventoryItemSchema, type CreateInventoryItemInput } from "@/validation/inventory";
import { useToast } from "@/components/ui/use-toast";
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
import { InventoryCategory, InventorySupplier, InventoryUnit, InventoryWarehouse } from "@/types/supabase";

const CreateProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: any;
}) => {
  const { toast } = useToast();
  const pathname = usePathname();

  // Extract domain from pathname
  const domain = pathname.split("/")[2] || "";

  const [units, setUnits] = useState<InventoryUnit[]>(data.units || []);
  const [categories, setCategories] = useState<InventoryCategory[]>(data.categories || []);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>(data.suppliers || []);
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>(data.warehouses || []);

  const form = useForm<CreateInventoryItemInput>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues: {
      name: "",
      description: "",
      item_type: "",
      category_id: undefined,
      supplier_id: undefined,
      is_stocked: true,
      is_consumable: true,
      is_active: true,
      // Variant fields
      internal_code: "",
      supplier_code: "",
      producer: "",
      producer_code: "",
      unit_id: undefined,
      purchase_unit_price: null,
      sell_unit_price: null,
      image_url: "",
      url_tds: "",
      warehouse_number: "",
      // Attributes
      color: "",
      color_code: "",
      width: null,
      height: null,
      length: null,
      thickness: null,
      diameter: null,
      category: "",
      category_code: "",
      subcategory: "",
      subcategory_code: "",
      subcategory2: "",
      subcategory2_code: "",
      // Initial stock
      initial_quantity: 0,
      warehouse_id: undefined,
    },
  });

  const { isSubmitting } = form.formState;

  // Fetch units if not provided
  useEffect(() => {
    if (units.length === 0) {
      fetch("/api/inventory/units/")
        .then(res => res.json())
        .then(data => setUnits(data))
        .catch(console.error);
    }
  }, [units.length]);

  const onSubmit: SubmitHandler<CreateInventoryItemInput> = async (d) => {
    try {
      const result = await createItem(d, domain);
      if (result.error) {
        toast({
          variant: "destructive",
          description: result.error,
        });
      } else {
        handleClose(false);
        toast({
          description: `Elemento ${d.name} creato correttamente!`,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        description: `Errore nel creare l'elemento! ${e}`,
      });
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
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} value={field.value || ""} />
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
                  <Input {...field} value={field.value || ""} />
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
                    <Input placeholder="es. LG_PA_MEL_9010" {...field} value={field.value || ""} />
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
                    <Input placeholder="es. 1000" {...field} value={field.value || ""} />
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

        {/* Quantity & Price Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Quantità e Prezzi
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="initial_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qta. Iniziale</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    />
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
                  <FormLabel>Unità</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unità..." />
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
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="purchase_unit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>P. Acquisto</FormLabel>
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
                  <FormLabel>P. Vendita</FormLabel>
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
                        <Input placeholder="es. Pannelli" {...field} value={field.value || ""} />
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
                        <Input placeholder="es. PA" {...field} value={field.value || ""} />
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
                        <Input placeholder="es. Pannello melaminico" {...field} value={field.value || ""} />
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
                        <Input placeholder="es. MEL" {...field} value={field.value || ""} />
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
                        <Input placeholder="es. BIANCO" {...field} value={field.value || ""} />
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
                        <Input placeholder="es. 9010" {...field} value={field.value || ""} />
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
                        <Input placeholder="es. HERZOG-HELMIGER" {...field} value={field.value || ""} />
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
                        <Input placeholder="es. HEHE" {...field} value={field.value || ""} />
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
                      <Input placeholder="es. HEHE" {...field} value={field.value || ""} />
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
                      <Input type="url" placeholder="https://..." {...field} value={field.value || ""} />
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
                      <Input type="url" placeholder="https://..." {...field} value={field.value || ""} />
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

export default CreateProductForm;
