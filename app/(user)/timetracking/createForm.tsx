"use client";
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
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { SearchSelect } from "../../../components/ui/search-select";
import { createItem } from "./actions/create-item.action";
import { validation } from "../../../validation/timeTracking/createManual";
import { useToast } from "../../../components/ui/use-toast";
import { Roles, Task, User } from "@prisma/client";

export interface Typology {
  name: string;
}

const CreateProductForm = ({
  handleClose,
  data,
  users,
  roles,
}: {
  handleClose: any;
  data: Task[];
  users: User[];
  roles: Roles[];
}) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      date: "", // if it's a date string or use new Date() if it expects a Date object
      description: "",
      descriptionCat: "",
      hours: 0, // Assuming hours is a number
      minutes: 0, // Assuming minutes is a number
      roles: "", // Assuming roles is an array
      task: "", // or the default value for a task id or object
      userId: "", // Assuming userId is a string or number
    },
  });

  const typology = [
    {
      name: "Nessuna",
    },
    {
      name: "Logistica",
    },
    {
      name: "Speciale",
    },
    {
      name: "Errore",
    },
  ];

  const { isSubmitting, errors } = form.formState;
  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      const timetracking = await createItem(d);
      if (timetracking) {
        handleClose(false);
        toast({
          //@ts-ignore
          description: `Elemento ${timetracking.id.toString()} creato correttamente!`,
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
          disabled={isSubmitting}
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data registrazione</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          // control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dipendente</FormLabel>
              <FormControl>
                <SearchSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                  options={users.map((u: User) => ({
                    value: u.id.toString(),
                    label: (u.given_name || "") + " " + (u.family_name || ""),
                  }))}
                  placeholder="Seleziona dipendente..."
                />
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruolo</FormLabel>
              <FormControl>
                {/* @ts-ignore */}
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: Roles) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              {/* <FormDescription>Il nome del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="task"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Progetto</FormLabel>
              <FormControl>
                <SearchSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                  options={data.map((t: Task) => ({
                    value: t.id.toString(),
                    label: t.unique_code!,
                  }))}
                  placeholder="Seleziona progetto..."
                />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ore</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minuti</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="descriptionCat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipologia</FormLabel>
              <FormControl>
                <SearchSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                  options={typology.map((t: Typology, index) => ({
                    value: t.name,
                    label: t.name,
                  }))}
                  placeholder="Seleziona tipologia..."
                />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
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

export default CreateProductForm;
