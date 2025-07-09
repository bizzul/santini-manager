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
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Button } from "@tremor/react";
import { createItem } from "./actions/create-role-item.action";
import { validation } from "../../../validation/employeeRoles/create";
import { useToast } from "../../../components/ui/use-toast";

const CreateRoleForm = ({ handleClose }: { handleClose: any }) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      name: "",
    },
  });

  const { setValue } = form;
  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      const user = await createItem(d);
      console.log("user response server", user);
      if (user) {
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

  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome ruolo</FormLabel>
              <FormControl>
                <Input {...field}  />
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
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

export default CreateRoleForm;
