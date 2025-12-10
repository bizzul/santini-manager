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
import { validation } from "@/validation/sellProductCategory/create";
import { useToast } from "@/hooks/use-toast";
import { SellProductCategory } from "@/types/supabase";
import { editItem } from "./actions/edit-item.action";

type Props = {
  handleClose: any;
  data: SellProductCategory;
};

const EditForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: data.name,
      description: data.description || "",
      color: data.color || "#3B82F6",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      const response = await editItem(d, data.id);

      if (response?.error) {
        toast({
          variant: "destructive",
          description: `Errore! ${response.error}`,
        });
      } else if (response?.success) {
        handleClose(false);
        toast({
          description: `Categoria ${d.name} aggiornata correttamente!`,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        description: `Errore nel modificare la categoria! ${e}`,
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

export default EditForm;
