"use client";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { usePathname, useRouter } from "next/navigation";

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
import { validation } from "@/validation/manufacturer/edit";
import { useToast } from "@/components/ui/use-toast";
import { Manufacturer, Manufacturer_category } from "@/types/supabase";
import ImageUploader from "@/components/uploaders/ImageUploader";
import Image from "next/image";
import { editItem } from "./actions/edit-item.action";
import { ManufacturerCategorySelector } from "@/components/manufacturers/CategorySelector";
import { logger } from "@/lib/logger";

const log = logger.scope("Manufacturers");

const EditProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: Manufacturer;
}) => {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [categories, setCategories] = useState<Manufacturer_category[]>([]);
  const [preview, setPreview] = useState<any | null>(null);
  const [file, setFile] = useState<any | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Extract domain from pathname (e.g., /sites/santini/manufacturers -> santini)
  const domain = pathname.split("/")[2] || "";

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      cap: undefined,
      manufacturer_category_id: null,
      contact: "",
      email: "",
      location: "",
      phone: "",
      short_name: "",
      website: "",
    },
  });

  useEffect(() => {
    const getCategories = async () => {
      if (!domain) return;

      try {
        setIsLoadingCategories(true);
        const response = await fetch(`/api/manufacturers/categories`, {
          headers: {
            "x-site-domain": domain,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch manufacturer categories");
        }
        const categoriesData = await response.json();
        setCategories(categoriesData);
      } catch (error) {
        log.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    getCategories();
  }, [domain]);

  useEffect(() => {
    if (data) {
      log.debug("Resetting form with data:", data);
      const resetValues = {
        name: data.name || "",
        short_name: data.short_name || "",
        address: data.address || "",
        cap: data.cap || undefined,
        contact: data.contact || "",
        description: data.description || "",
        email: data.email || "",
        location: data.location || "",
        phone: data.phone || "",
        website: data.website || "",
        manufacturer_category_id: data.manufacturer_category_id || null,
      };
      log.debug("Reset values:", resetValues);
      form.reset(resetValues);
      setPreview(data.manufacturer_image);
    }
  }, [data, form]);

  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      log.debug("Form data being submitted:", d);
      log.debug("Manufacturer ID:", data.id);

      //@ts-ignore
      const manufacturer = await editItem(d, data.id);

      // Check if there's an error in the response
      if (manufacturer?.message) {
        log.error("Server error:", manufacturer);

        // Build detailed error message
        let errorDetails = manufacturer.message;
        if (manufacturer.errors) {
          log.error("Validation errors:", manufacturer.errors);
          // Extract field errors
          const fieldErrors = Object.entries(manufacturer.errors)
            .filter(([key]) => key !== "_errors")
            .map(([key, value]: [string, any]) => {
              if (value?._errors?.length > 0) {
                return `${key}: ${value._errors.join(", ")}`;
              }
              return null;
            })
            .filter(Boolean);

          if (fieldErrors.length > 0) {
            errorDetails += "\n" + fieldErrors.join("\n");
          }
        }

        toast({
          title: "❌ Errore di validazione",
          description: errorDetails,
          variant: "destructive",
        });
        return;
      }

      if (manufacturer && file) {
        //@ts-ignore
        const photoUpload = await uploadPictureHandler(manufacturer.id);
        if (photoUpload == "ok") {
          toast({
            title: "✅ Successo",
            description: `Produttore "${d.name}" aggiornato correttamente!`,
          });
          form.reset();
          router.refresh();
          handleClose(false);
        } else {
          toast({
            title: "⚠️ Attenzione",
            description: `Produttore salvato ma errore nel caricare l'immagine: ${photoUpload}`,
            variant: "destructive",
          });
          router.refresh();
        }
      } else if (manufacturer && !file) {
        toast({
          title: "✅ Successo",
          description: `Produttore "${d.name}" aggiornato correttamente!`,
        });
        form.reset();
        router.refresh();
        handleClose(false);
      }
    } catch (e) {
      toast({
        title: "❌ Errore",
        description: `Errore nell'aggiornare il produttore: ${e}`,
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (file: any) => {
    setFile(file);
  };

  const uploadPictureHandler = async (data: number) => {
    const pictureData = new FormData();
    pictureData.append("image", file);
    //@ts-ignore
    pictureData.append("id", data);
    try {
      const response = await fetch("/api/local-upload/manufacturer", {
        method: "POST",
        body: pictureData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      setFile(null);
      return "ok";
    } catch (error: any) {
      log.error("Upload error:", error.message);
      return error.message;
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="manufacturer_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                {isLoadingCategories ? (
                  <div className="text-sm text-muted-foreground">
                    Caricamento categorie...
                  </div>
                ) : (
                  <ManufacturerCategorySelector
                    categories={categories}
                    value={field.value?.toString() || ""}
                    onValueChange={(selectedId) => {
                      field.onChange(selectedId ? Number(selectedId) : null);
                    }}
                    disabled={isSubmitting}
                    domain={domain}
                    onCategoryCreated={(newCategory) => {
                      setCategories((prev) => [...prev, newCategory]);
                      field.onChange(newCategory.id);
                    }}
                  />
                )}
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
              <FormLabel>
                Nome <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="short_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Corto</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>P. di Contatto</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
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
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-row gap-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cap"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CAP</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Località</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-row gap-2">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-row justify-between gap-10 align-middle items-center">
          {" "}
          <ImageUploader
            onChange={handleFileChange}
            setPreview={setPreview}
            preview={preview}
            file={file}
          />
          {preview && (
            <Image src={preview} width={100} height={100} alt={file} />
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {" "}
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm mr-1"></span>
          )}{" "}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default EditProductForm;
