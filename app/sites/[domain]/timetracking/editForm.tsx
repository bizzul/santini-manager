"use client";
import React, { useEffect, useState, useTransition } from "react";
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
import {
  Button,
  MultiSelect,
  MultiSelectItem,
  Select,
  SelectItem,
} from "@tremor/react";
import { validation } from "@/validation/timeTracking/createManual";
import { useToast } from "@/components/ui/use-toast";
import { SearchSelect, SearchSelectItem } from "@tremor/react";
import { editItem } from "./actions/edit-item.action";
import { Roles, Task, User, Timetracking } from "@prisma/client";
import { Typology } from "./createForm";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(date: Date) {
  // Padding function to add leading zeros if necessary
  const pad = (num: number) => (num < 10 ? "0" + num : num);

  // Constructing each part of the date
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // getMonth() returns 0-11
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  // Constructing the format
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const EditForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: Timetracking & { roles: Roles[] };
}) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Roles[]>([]);

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

  const { setValue } = form;

  useEffect(() => {
    const getTasks = async () => {
      try {
        const response = await fetch(`/api/tasks/`);
        if (!response.ok) {
          throw new Error("Failed to fetch tasks list");
        }
        const t = await response.json();
        setTasks(t);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    const getUsers = async () => {
      try {
        const response = await fetch(`/api/users/list/`);
        if (!response.ok) {
          throw new Error("Failed to fetch users list");
        }
        const t = await response.json();
        setUsers(t);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    const getRoles = async () => {
      try {
        const response = await fetch(`/api/roles/`);
        if (!response.ok) {
          throw new Error("Failed to fetch roles list");
        }
        const t = await response.json();
        setRoles(t);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    // Execute all fetches
    getTasks();
    getUsers();
    getRoles();
  }, []); // Empty dependency array means this effect runs once on mount

  useEffect(() => {
    setValue("date", formatDate(data.created_at));
    setValue("description", data.description ?? undefined);
    setValue("descriptionCat", data.description_type ?? undefined);
    setValue("hours", data.hours!);
    setValue("minutes", data.minutes!);

    // Update this section to properly handle roles
    if (data.roles) {
      // If roles is an array of objects with id property
      if (Array.isArray(data.roles) && data.roles.length > 0) {
        setValue("roles", data.roles[0].id.toString());
      }
      // If roles is a single value
      else if (data.roles) {
        setValue("roles", data.roles.toString());
      }
    }

    setValue("task", data.task_id!.toString());
    setValue("userId", data.employee_id!.toString());
  }, [data, setValue]);

  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      const timetracking = await editItem(d, data.id);
      console.log("timetracking response server", timetracking);
      if (timetracking) {
        handleClose(false);
        toast({
          //@ts-ignore
          description: `Elemento ${timetracking.id} aggiornato correttamente!`,
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
                <Input type="datetime-local" {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        {users.length ? (
          <FormField
            // control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dipendente</FormLabel>
                <FormControl>
                  <SearchSelect
                    {...field}
                    onChange={(e) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(e);
                    }}
                    disabled={isSubmitting}
                  >
                    {users.map((u: User) => (
                      <SearchSelectItem key={u.id} value={u.id.toString()}>
                        {u.given_name + " " + u.family_name}
                      </SearchSelectItem>
                    ))}
                  </SearchSelect>
                </FormControl>
                {/* <FormDescription>Categoria del prodotto</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <Skeleton className="w-32 h-8" />
        )}

        {roles.length ? (
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
                    {...field}
                    onChange={(e) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(e);
                    }}
                    disabled={isSubmitting}
                  >
                    {roles.map((r: Roles) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </Select>
                </FormControl>
                {/* <FormDescription>Il nome del prodotto</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <Skeleton className="w-32 h-8" />
        )}
        {tasks.length ? (
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="task"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progetto</FormLabel>
                <FormControl>
                  <SearchSelect
                    {...field}
                    onChange={(e) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(e);
                    }}
                    disabled={isSubmitting}
                  >
                    {tasks.map((t: Task) => (
                      <SearchSelectItem key={t.id} value={t.id.toString()}>
                        {t.unique_code}
                      </SearchSelectItem>
                    ))}
                  </SearchSelect>
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <Skeleton className="w-32 h-8" />
        )}
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
                  {...field}
                  onChange={(e) => {
                    // This ensures that the selected value updates the react-hook-form state
                    field.onChange(e);
                  }}
                  disabled={isSubmitting}
                >
                  {typology.map((t: Typology, index) => (
                    <SearchSelectItem key={index} value={t.name}>
                      {t.name}
                    </SearchSelectItem>
                  ))}
                </SearchSelect>
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

export default EditForm;
