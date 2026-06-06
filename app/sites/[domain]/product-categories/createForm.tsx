"use client";
import React from "react";
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
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/sellProductCategory/create";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { SellCategoryImageUpload } from "@/components/sell-categories/sell-category-image-upload";

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
  const [createdCategoryId, setCreatedCategoryId] = React.useState<number | null>(
    null,
  );
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
    },
  });

  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      const result = await createItem(d, domain);
      if (result?.success && result?.data?.id) {
        setCreatedCategoryId(result.data.id);
        toast({
          description: `Categoria ${d.name} creata correttamente!`,
        });
        router.refresh();
        return;
      } else if (result?.success) {
        handleClose();
        router.refresh();
      } else if (result?.error) {
        toast({
          variant: "destructive",
          description: `Errore: ${result.error}`,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        description: `Errore nel creare la categoria! ${e}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4">
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
                    placeholder="es. Arredamento"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colore</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      type="color"
                      disabled={isSubmitting}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
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
                  placeholder="es. Prodotti di arredamento"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {createdCategoryId && canManageImages && (
          <SellCategoryImageUpload
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
