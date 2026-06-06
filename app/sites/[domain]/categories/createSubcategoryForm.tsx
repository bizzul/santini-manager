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
import { createSubcategory } from "./actions/create-subcategory.action";
import { validation } from "@/validation/inventorySubcategory/create";
import { useToast } from "@/hooks/use-toast";
import { SubcategoryImageUpload } from "@/components/categories/subcategory-image-upload";

const formSchema = validation.omit({ categoryId: true });

interface CreateSubcategoryFormProps {
  handleClose: () => void;
  domain: string;
  categoryId: string;
  categoryName: string;
  canManageImages?: boolean;
}

const CreateSubcategoryForm = ({
  handleClose,
  domain,
  categoryId,
  categoryName,
  canManageImages = false,
}: CreateSubcategoryFormProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const [createdSubcategory, setCreatedSubcategory] = useState<{
    key: string;
    name: string;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values) => {
    try {
      const response = await createSubcategory(
        {
          name: values.name,
          description: values.description,
          categoryId,
        },
        domain,
      );

      if (response?.message) {
        toast({
          description: `Errore nel creare la sottocategoria! ${response.message}`,
        });
        return;
      }

      if (response?.data?.subcategory_key) {
        setCreatedSubcategory({
          key: response.data.subcategory_key,
          name: response.data.subcategory_name,
        });
        toast({
          description: `Sottocategoria ${values.name} creata correttamente!`,
        });
        router.refresh();
        return;
      }

      handleClose();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        description: `Errore nel creare la sottocategoria! ${message}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormItem>
          <FormLabel>Categoria</FormLabel>
          <FormControl>
            <Input value={categoryName} disabled readOnly />
          </FormControl>
        </FormItem>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome sottocategoria</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isSubmitting || Boolean(createdSubcategory)}
                  placeholder="es. Pannelli"
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
                  disabled={isSubmitting || Boolean(createdSubcategory)}
                  placeholder="es. Pannelli MDF, truciolari, etc."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {createdSubcategory && canManageImages && (
          <SubcategoryImageUpload
            domain={domain}
            categoryId={categoryId}
            subcategoryKey={createdSubcategory.key}
            subcategoryName={createdSubcategory.name}
            onUploadComplete={() => router.refresh()}
            onRemove={() => router.refresh()}
          />
        )}

        <div className="flex gap-2">
          {!createdSubcategory ? (
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

export default CreateSubcategoryForm;
