"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { validation } from "@/validation/products/create";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product_category, Supplier } from "@/types/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const CreateProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: any;
}) => {
  const { toast } = useToast();
  const pathname = usePathname();
  
  // Extract domain from pathname (e.g., /sites/santini/inventory -> santini)
  const domain = pathname.split("/")[2] || "";
  
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

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      // Use form.getValues() to ensure all registered field values are captured
      const formValues = form.getValues();
      //@ts-ignore
      await createItem(formValues, domain);
      handleClose(false);
      toast({
        description: `Elemento ${formValues.name} creato correttamente!`,
      });
    } catch (e) {
      toast({
        description: `Errore nel creare l'elemento! ${e}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Informazioni Base</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="productCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria DB</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {data.categories?.map((cat: Product_category) => (
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
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornitore</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {data.suppliers?.map((sup: Supplier) => (
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                  <Input {...field} />
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
                    <Input placeholder="es. LG_PA_MEL_9010" {...field} />
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
                    <Input placeholder="es. 1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Dimensions Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Dimensioni</h3>
          <div className="grid grid-cols-3 gap-2">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Larghezza</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                    <Input type="number" {...field} />
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
                    <Input type="number" {...field} />
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
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
          <h3 className="text-sm font-medium text-muted-foreground">Quantità e Prezzi</h3>
          <div className="grid grid-cols-4 gap-2">
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qta.</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                    <Input placeholder="PZ, ML, KG..." {...field} />
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
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value);
                        field.onChange(isNaN(num) ? 0 : num);
                      }}
                    />
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
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                        <Input placeholder="es. LEGNO" {...field} />
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
                        <Input placeholder="es. LG" {...field} />
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
                        <Input placeholder="es. Pannelli" {...field} />
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
                        <Input placeholder="es. PA" {...field} />
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
                        <Input placeholder="es. Pannello melaminico" {...field} />
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
                        <Input placeholder="es. MEL" {...field} />
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
                        <Input placeholder="es. BIANCO" {...field} />
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
                        <Input placeholder="es. 9010" {...field} />
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
                        <Input placeholder="es. HERZOG-HELMIGER" {...field} />
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
                        <Input placeholder="es. HEHE" {...field} />
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
                      <Input placeholder="es. HEHE" {...field} />
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
                      <Input type="url" placeholder="https://..." {...field} />
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
                      <Input type="url" placeholder="https://..." {...field} />
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
