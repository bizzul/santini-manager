"use client";
import React, { useEffect, useState, useTransition } from "react";
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
import { Button } from "@tremor/react";
import { validation } from "@/validation/supplier/edit";
import { useToast } from "@/components/ui/use-toast";
import { SearchSelect, SearchSelectItem } from "@tremor/react";
import { Product_category, Supplier } from "@prisma/client";
import ImageUploader from "@/components/uploaders/ImageUploader";
import Image from "next/image";
import { editItem } from "./actions/edit-item.action";

const EditProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: Supplier;
}) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Product_category[]>();
  const [preview, setPreview] = useState<any | null>(null);
  const [file, setFile] = useState<any | null>(null);
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      cap: undefined,
      category: "",
      contact: "",
      email: "",
      location: "",
      phone: "",
      short_name: "",
      website: "",
    },
  });

  const { setValue } = form;

  useEffect(() => {
    const getCategories = async () => {
      try {
        const response = await fetch(`/api/inventory/categories/`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const categories = await response.json();
        setCategories(categories);
        // setValue("category", categories[0].name);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    getCategories();
  }, []);

  useEffect(() => {
    setValue("name", data.name);
    setValue("short_name", data.short_name ?? undefined);
    //@ts-ignore
    setValue("address", data.address ?? undefined);
    setValue("cap", data.cap ?? undefined);
    setValue("contact", data.contact ?? undefined);
    setValue("description", data.description ?? undefined);
    setValue("email", data.email ?? undefined);
    //@ts-ignore
    setValue("location", data.location ?? undefined);
    setValue("phone", data.phone ?? undefined);
    setValue("website", data.website ?? undefined);
    //@ts-ignore
    setValue("category", data.category ?? undefined);
    console.log("categories", categories);

    setPreview(data.supplier_image);
  }, [data, setValue]);

  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      const supplier = await editItem(d, data.id);
      console.log("supplier response server", supplier);
      if (supplier && file) {
        //@ts-ignore
        const photoUpload = await uploadPictureHandler(supplier.id);
        if (photoUpload == "ok") {
          handleClose(false);
          toast({
            description: `Elemento ${d.name} creato correttamente!`,
          });
          form.reset();
        } else {
          toast({
            description: `Errore nel caricare l'immagine! ${photoUpload}`,
          });
        }
      } else if (supplier && !file) {
        handleClose(false);
        toast({
          description: `Elemento ${d.name} creato correttamente!`,
        });
        form.reset();
      }
    } catch (e) {
      toast({
        description: `Errore nel creare l'elemento! ${e}`,
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
      const response = await fetch("/api/local-upload/supplier", {
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
      console.log(error.message);
      return error.message;
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          // control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                {categories?.length && (
                  <SearchSelect
                    {...field}
                    onChange={(e) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(e);
                    }}
                    disabled={isSubmitting}
                  >
                    {categories.map((cat: Product_category) => (
                      <SearchSelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SearchSelectItem>
                    ))}
                  </SearchSelect>
                )}
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
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
              {/* <FormDescription>Il nome del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="short_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Corto</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>P. di Contatto</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-row gap-2">
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="cap"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CAP</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Località</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-row gap-2">
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
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
