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
import { editSellProductAction } from "./actions/edit-item.action";

type Props = {
  handleClose: any;
  data: any;
};

const EditProductForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      type: "",
    },
  });
  const { setValue } = form;
  const { isSubmitting } = form.formState;
  const { pending } = useFormStatus();
  useEffect(() => {
    setValue("name", data.name);
    setValue("type", data.type);
  }, [data, setValue]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    const response = await editSellProductAction(d, data?.id);
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
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Il nome del prodotto</FormDescription>
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
