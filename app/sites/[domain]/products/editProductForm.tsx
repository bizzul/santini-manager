"use client";
import React, { useEffect, useOptimistic } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validation } from "@/validation/sellProducts/create";
import { useToast } from "@/components/ui/use-toast";
import { useFormState, useFormStatus } from "react-dom";
import { SellProduct } from "@/types/supabase";
import { editSellProductAction } from "./actions/edit-item.action";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  handleClose: any;
  data: SellProduct;
  domain?: string;
};

const EditProductForm = ({ handleClose, data, domain }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      type: "",
      active: true,
    },
  });
  const { setValue } = form;
  const { isSubmitting } = form.formState;
  const { pending } = useFormStatus();
  useEffect(() => {
    setValue("name", data.name || "");
    setValue("type", data.type || "");
    setValue("active", data.active ?? true);
  }, [data, setValue]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    //@ts-expect-error
    const response = await editSellProductAction(d, data?.id, domain);
    if (response?.error) {
      toast({
        description: `Errore! ${response.error}`,
      });
    } else {
      handleClose(false);
      toast({
        description: `Elemento ${d.name} aggiornato correttamente!`,
      });
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>La categoria del prodotto</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>La descrizione del prodotto</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Attivo</FormLabel>
                <FormDescription>
                  {`Questo prodotto è attualmente ${
                    field.value ? "attivo" : "inattivo"
                  }`}
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          {" "}
          {pending && (
            <span className="spinner-border spinner-border-sm mr-1"></span>
          )}{" "}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default EditProductForm;
