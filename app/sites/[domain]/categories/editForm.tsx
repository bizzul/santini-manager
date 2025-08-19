"use client";
import React, { useEffect } from "react";
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
import { validation } from "@/validation/productsCategory/create";
import { useToast } from "@/hooks/use-toast";
import { Product_category } from "@/types/supabase";
import { editItem } from "./actions/edit-item.action";

type Props = {
  handleClose: any;
  data: Product_category;
};

const EditProductForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: data.name,
      description: data.description,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      const response = await editItem(d, data.id);

      if (response?.error) {
        toast({
          description: `Errore! ${response.error}`,
        });
      } else if (response?.success) {
        handleClose(false);
        toast({
          description: `Elemento ${d.name} aggiornato correttamente!`,
        });
      } else {
        console.log("Unexpected response:", response);
      }
    } catch (e) {
      console.error("Error in form submission:", e);
      toast({
        description: `Errore nel modificare l'elemento! ${e}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} />
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
                <Input {...field} disabled={isSubmitting} />
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

export default EditProductForm;
