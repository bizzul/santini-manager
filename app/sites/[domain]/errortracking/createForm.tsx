"use client";
import React, { useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/errorTracking/create";
import { useToast } from "@/components/ui/use-toast";
import { Product_category, Supplier, Task, User } from "@prisma/client";
import { CldUploadButton } from "next-cloudinary";

const CreateProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: any;
}) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      errorCategory: "fornitore",
      user: "",
      description: "",
      errorType: "",
      position: "",
      supplier: "",
      task: "",
    },
  });

  const { isSubmitting, errors } = form.formState;
  const [uploaded, setUploadedFile] = useState<File[] | null | []>([]);
  const [fileIds, setFileIds] = useState<any>([]);
  const [resource, setResource] = useState(undefined);
  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      const dataObject = { data: d, fileIds: fileIds };
      const res = await createItem(dataObject);
      handleClose(false);
      toast({
        description: `Elemento ${d.errorType} creato correttamente!`,
      });
      form.reset();
      //@ts-ignore
      if (res.error === true) {
        toast({
          //@ts-ignore
          description: `Errore! ${res.message}`,
        });
      }
    } catch (e) {
      toast({
        description: `Errore nel creare l'elemento! ${e}`,
      });
    }
  };

  const handleUpload = (result: any) => {
    if (result) {
      // console.log("risultato", result);
      fetch("/api/files/create", {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(result.info),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            toast({
              description: `Errore upload immagine ${data.message}`,
            });
          } else if (data.issues) {
            toast({
              description: `Invalid data found`,
            });
          } else {
            setUploadedFile((current: any) => [...current, data.result]);
            setFileIds((current: any) => [...current, data.result.id]);
          }
        });
    }
  };

  console.log(errors);

  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit)}>
        <div className="shadow sm:rounded-md sm:overflow-hidden z-10">
          <FormField
            name="user"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Utente del report</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={(value) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(value);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data.users.map((user: User) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.given_name + " " + user.family_name}
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

          <FormField
            name="errorCategory"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel> Categoria errore</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={(value) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(value);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fornitore">Fornitore</SelectItem>
                      <SelectItem value="reparto">Reparto</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                {/* <FormDescription>Categoria del prodotto</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 ">
            <FormField
              name="task"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progetto</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      onValueChange={(value) => {
                        // This ensures that the selected value updates the react-hook-form state
                        field.onChange(value);
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.tasks.map((t: Task) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.unique_code}
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
          </div>

          <div className="grid grid-cols-1 gap-6">
            <FormField
              name="errorType"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Tipo errore</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      onValueChange={(value) => {
                        // This ensures that the selected value updates the react-hook-form state
                        field.onChange(value);
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {form.watch("errorCategory") === "fornitore"
                          ? data.categories.map(
                              (category: Product_category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.name.toLowerCase()}
                                >
                                  {category.name}
                                </SelectItem>
                              )
                            )
                          : data.roles.map((role: any) => (
                              <SelectItem
                                key={role.id}
                                value={role.id.toString()}
                              >
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
          </div>

          {form.watch("errorCategory") === "reparto" ? (
            ""
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <FormField
                name="supplier"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornitore</FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        onValueChange={(value) => {
                          // This ensures that the selected value updates the react-hook-form state
                          field.onChange(value);
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {data.suppliers
                            .filter(
                              (supplier: Supplier) =>
                                supplier.category?.toLowerCase() ===
                                form.watch("errorType")?.toLowerCase()
                            )
                            .map((supplier: Supplier) => (
                              <SelectItem
                                key={supplier.id}
                                value={supplier.id.toString()}
                              >
                                {supplier.name}
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
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <FormField
              name="position"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posizione</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  {/* <FormDescription>Categoria del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <FormField
          name="description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6">
          <div className="col-span-3 sm:col-span-2">
            <label
              htmlFor="photo"
              className="block text-sm font-medium text-gray-200"
            >
              Foto
            </label>
            <div className="mt-1 flex flex-row gap-4 rounded-md shadow-xs">
              <div className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <CldUploadButton
                  className="z-50"
                  uploadPreset="uploadpdf"
                  onUpload={(result: any) => handleUpload(result)}
                  options={{
                    sources: ["local", "camera"],
                    multiple: true,
                  }}
                >
                  Carica foto
                </CldUploadButton>
              </div>

              {uploaded && (
                <div>
                  <p>File caricati:</p>
                  <ul>
                    {uploaded.map((file: any) => (
                      <li key={file.id}>{`${file.id} - ${file.name}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* {uploaded !== null && (
              <span className="text-red-500 text-xs">Foto richiesta</span>
            )} */}
          </div>
        </div>

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
