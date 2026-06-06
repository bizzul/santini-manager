"use client";

import React, { useState } from "react";
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
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/productsCategory/create";
import { useToast } from "@/hooks/use-toast";
import { CategoryImageUpload } from "@/components/categories/category-image-upload";

const CreateForm = ({
  handleClose,
  domain,
  canManageImages = false,
}: {
  handleClose: () => void;
  domain: string;
  canManageImages?: boolean;
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (values) => {
    try {
      const response = await createItem(values, domain);

      if (response?.message) {
        toast({ description: `Errore nel creare l'elemento! ${response.message}` });
        return;
      }

      if (response?.data?.id) {
        setCreatedCategoryId(response.data.id);
        toast({
          description: `Categoria ${values.name} creata correttamente!`,
        });
        router.refresh();
        return;
      }

      handleClose();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ description: `Errore nel creare l'elemento! ${message}` });
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
                    disabled={isSubmitting || Boolean(createdCategoryId)}
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
                    disabled={isSubmitting || Boolean(createdCategoryId)}
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
                  disabled={isSubmitting || Boolean(createdCategoryId)}
                  placeholder="es. Pannelli, tavole, etc."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {createdCategoryId && canManageImages && (
          <CategoryImageUpload
            domain={domain}
            categoryId={createdCategoryId}
            onUploadComplete={() => router.refresh()}
            onRemove={() => router.refresh()}
          />
        )}

        <div className="flex gap-2">
          {!createdCategoryId ? (
            <Button type="submit" disabled={isSubmitting}>
              Salva
            </Button>
          ) : (
            <Button type="button" onClick={handleClose}>
              Chiudi
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

export default CreateForm;
