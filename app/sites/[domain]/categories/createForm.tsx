"use client";
import React, { useTransition } from "react";
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
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { createItem } from "./actions/create-item.action";
import { validation } from "../../../validation/productsCategory/create";
import { useToast } from "../../../components/ui/use-toast";

const CreateForm = ({ handleClose }: { handleClose: any }) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      console.log("data", d);
      await createItem(d);
      handleClose(false);
      toast({
        description: `Elemento ${d.name} creato correttamente!`,
      });
      // form.reset();
    } catch (e) {
      toast({
        description: `Errore nel creare l'elemento! ${e}`,
      });
    }
  };

  console.log("error", errors);

  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field}  disabled={isSubmitting} />
              </FormControl>
              {/* <FormDescription>Il nome del prodotto</FormDescription> */}
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
                  
                  disabled={isSubmitting}
                />
              </FormControl>
              {/* <FormDescription>Il nome del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

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

export default CreateForm;
