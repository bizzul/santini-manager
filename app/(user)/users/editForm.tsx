"use client";
import React, { useEffect, useState } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { validation } from "../../../validation/users/editInfo";
import { useToast } from "../../../components/ui/use-toast";
import { Roles, User } from "@prisma/client";
import { editItem } from "./actions/edit-item.action";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faIdBadge,
  faMedal,
  faSignIn,
} from "@fortawesome/free-solid-svg-icons";
import { Role } from "auth0";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../../lib/utils";

const EditProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: User;
}) => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>();
  const [role, setUserRole] = useState();
  const [employeeRoles, setEmployeeRoles] = useState<Roles[]>();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      email: "",
      given_name: "",
      family_name: "",
      incarichi: [],
      role: "MODERATOR",
    },
  });

  const { setValue } = form;

  useEffect(() => {
    const getUserRole = async () => {
      try {
        //@ts-ignore
        const response = await fetch(`/api/users/roles/${data.user_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user role");
        }
        const role = await response.json();
        setUserRole(role);
        // setValue("category", categories[0].name);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    const getRoles = async () => {
      try {
        const response = await fetch(`/api/users/roles/`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const roles = await response.json();
        setRoles(roles);
        // setValue("category", categories[0].name);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    const getEmployeeRoles = async () => {
      try {
        const response = await fetch(`/api/users/employeeRoles/`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const roles = await response.json();
        setEmployeeRoles(roles);
        // setValue("category", categories[0].name);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };
    getUserRole();
    getEmployeeRoles();
    getRoles();
  }, []);

  useEffect(() => {
    setValue("given_name", data.given_name ?? "");
    setValue("family_name", data.family_name ?? "");
    setValue("email", data.email);
    if (employeeRoles && roles && role) {
      //@ts-ignore
      setValue("role", role.rolesData[0].id);
      // Extract just the ids from each incarico
      //@ts-ignore
      const incarichiIds = data.incarichi.map((incarico) =>
        incarico.id.toString()
      );
      setValue("incarichi", incarichiIds);
    }
  }, [data, setValue, employeeRoles, roles, role]);

  const { isSubmitting, errors } = form.formState;

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      const user = await editItem(d, data.user_id);
      console.log("user response server", user);
      handleClose(false);
      toast({
        description: `Utente ${d.email} aggiornato correttamente!`,
      });
      form.reset();
    } catch (e) {
      toast({
        description: `Errore nell'aggiornare l'elemento! ${e}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form
        className="space-y-4 relative md:max-w-lg max-w-sm"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <h1 className="text-lg font-bold flex-row text-slate-500">
          <FontAwesomeIcon icon={faSignIn} className="mr-2 " />
          Dati di accesso
        </h1>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email"  />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <h1 className="text-lg font-bold flex-row text-slate-500">
          <FontAwesomeIcon icon={faIdBadge} className="mr-2 " />
          Dati personali
        </h1>

        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="given_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input  {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="family_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cognome</FormLabel>
              <FormControl>
                <Input  {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <h1 className="text-lg font-bold flex-row text-slate-500">
          <FontAwesomeIcon icon={faMedal} className="mr-2 " />
          Ruolo dipendente
        </h1>
        {employeeRoles && (
          <div className="w-auto relative">
            <FormField
              control={form.control}
              name="incarichi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incarichi</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value && field.value.length > 0
                            ? employeeRoles?.find((role) =>
                                field.value.includes(role.id.toString())
                              )?.name
                            : "Seleziona incarichi..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput  />
                          <CommandEmpty>Nessun incarico trovato.</CommandEmpty>
                          <CommandGroup>
                            {employeeRoles?.map((role: Roles) => (
                              <CommandItem
                                key={role.id}
                                value={role.id.toString()}
                                onSelect={(value: string) => {
                                  const currentValues = field.value || [];
                                  const newValues = currentValues.includes(
                                    value
                                  )
                                    ? currentValues.filter((v) => v !== value)
                                    : [...currentValues, value];
                                  field.onChange(newValues);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value?.includes(role.id.toString())
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {role.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  {/* <FormDescription>Categoria del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {roles && (
          <>
            <h1>Accesso gestionale</h1>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value: string) => {
                        field.onChange(value);
                      }}
                      value={field.value || ""}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue  />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role: Role) => (
                          <SelectItem
                            key={role.id}
                            value={role.id?.toString() || ""}
                          >
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
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

export default EditProductForm;
