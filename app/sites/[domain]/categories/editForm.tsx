"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

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
import { validation } from "@/validation/productsCategory/create";
import { useToast } from "@/hooks/use-toast";
import { InventoryCategory } from "@/types/supabase";
import { editItem } from "./actions/edit-item.action";
import { CategoryImageUpload } from "@/components/categories/category-image-upload";

type Props = {
  handleClose: () => void;
  data: InventoryCategory;
  domain: string;
};

const EditProductForm = ({ handleClose, data, domain }: Props) => {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: data.name,
      code: data.code || "",
      description: data.description || "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (values) => {
    try {
      const response = await editItem(values, data.id, domain);

      if (response?.error) {
        toast({ description: `Errore! ${response.error}` });
        return;
      }

      if (response?.success) {
        handleClose();
        toast({
          description: `Categoria ${values.name} aggiornata correttamente!`,
        });
        router.refresh();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ description: `Errore nel modificare l'elemento! ${message}` });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    placeholder="es. LEG"
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
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isSubmitting}
                  placeholder="es. Pannelli, tavole, etc."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <CategoryImageUpload
          domain={domain}
          categoryId={data.id}
          currentUrl={data.image_url}
          onUploadComplete={() => router.refresh()}
          onRemove={() => router.refresh()}
          disabled={isSubmitting}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default EditProductForm;
