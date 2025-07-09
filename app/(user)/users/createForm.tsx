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
import { createItem } from "./actions/create-item.action";
import { validation } from "../../../validation/users/create";
import { useToast } from "../../../components/ui/use-toast";
import { Roles } from "@prisma/client";
import { Datas } from "./page";
import PasswordStrengthBar from "react-password-strength-bar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faIdBadge,
  faMedal,
  faRefresh,
  faSignIn,
} from "@fortawesome/free-solid-svg-icons";

const generator = require("generate-password");

const CreateProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: Datas;
}) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      password: "",
      email: "",
      given_name: "",
      family_name: "",
      incarichi: "",
      role: "MODERATOR",
    },
  });

  const { setValue } = form;
  const { isSubmitting, errors } = form.formState;

  const [passwordVisible, setPasswordVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const watchPassword = form.watch("password", "");

  /**
   * Generates a new password and sets the value in the input field
   */
  const generatePassword = () => {
    setValue(
      "password",
      generator.generate({
        length: 12,
        numbers: true,
        uppercase: true,
      })
    );
  };

  //Initial render
  useEffect(() => {
    generatePassword();
  }, []);

  console.log("errors", errors);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      //@ts-ignore
      const user = await createItem(d);
      console.log("user response server", user);
      if (user) {
        handleClose(false);
        toast({
          description: `Elemento ${d.email} creato correttamente!`,
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
                <Input {...field} type="email" />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
        <div></div>
        <FontAwesomeIcon
          icon={passwordVisible ? faEye : faEyeSlash}
          className="relative float-right right-3 top-7 text-gray-500 cursor-pointer"
          onClick={() => setPasswordVisible(!passwordVisible)}
        ></FontAwesomeIcon>
        <FontAwesomeIcon
          icon={faRefresh}
          className="relative float-right right-5 top-7 text-gray-500  cursor-pointer"
          onClick={() => generatePassword()}
        ></FontAwesomeIcon>
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type={passwordVisible ? "text" : "password"}
                  {...field}
                />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <PasswordStrengthBar
          password={watchPassword}
          scoreWords={["Debole", "Debole", "Accettabile", "Buona", "Forte"]}
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
          name="family_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cognome</FormLabel>
              <FormControl>
                <Input {...field} />
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
        <FormField
          control={form.control}
          name="incarichi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Incarichi</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un incarico" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* @ts-ignore */}
                    {data.employeeRoles.map((role: Roles) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <h1>Accesso gestionale</h1>

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruolo</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* @ts-ignore */}
                    {data.roles.map((role: Roles) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

export default CreateProductForm;
