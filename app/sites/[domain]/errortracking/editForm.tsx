"use client";
import React, { useEffect, useOptimistic, useState } from "react";
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
import { Button, Textarea } from "@tremor/react";
import { validation } from "@/validation/errorTracking/create";
import { useToast } from "@/components/ui/use-toast";
import { useFormStatus } from "react-dom";
import { Product_category, Roles, Supplier, Task, User } from "@prisma/client";
import { editItem } from "./actions/edit-item.action";
import { SearchSelect, SearchSelectItem } from "@tremor/react";
import { CldUploadButton } from "next-cloudinary";
import Image from "next/image";

type Props = {
  handleClose: any;
  data: any;
};

const EditProductForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      errorCategory: "",
      user: "",
      description: "",
      errorType: "",
      position: "",
      supplier: "",
      task: "",
    },
  });
  const { setValue } = form;
  const { isSubmitting, errors } = form.formState;
  const { pending } = useFormStatus();

  const [categories, setCategories] = useState<Product_category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [roles, setRoles] = useState<Roles[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [uploaded, setUploadedFile] = useState<File[] | null | []>([]);
  const [fileIds, setFileIds] = useState<any>([]);

  useEffect(() => {
    const getSuppliers = async () => {
      const d = await fetch(`../api/inventory/suppliers/`);
      if (!d.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const suppliers = await d.json();
      setSuppliers(suppliers);
      // setValue("supplierId", suppliers[0].id);
    };

    const getCategories = async () => {
      try {
        const response = await fetch(`../api/inventory/categories/`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const categories = await response.json();
        setCategories(categories);
        // setValue("productCategoryId", categories[0].id);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    const getRoles = async () => {
      try {
        const response = await fetch(`../api/roles/`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const roles = await response.json();
        setRoles(roles);
        // setValue("productCategoryId", categories[0].id);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    const getTasks = async () => {
      try {
        const response = await fetch(`../api/tasks/`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const roles = await response.json();
        setTasks(roles);
        // setValue("productCategoryId", categories[0].id);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    const getUsers = async () => {
      try {
        const response = await fetch(`../api/users/list`);
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const roles = await response.json();
        setUsers(roles);
        // setValue("productCategoryId", categories[0].id);
      } catch (error) {
        console.error(error);
        // Handle the error state appropriately
      }
    };

    setValue("errorCategory", data.error_category);
    setValue("description", data.description);
    setValue("errorType", data.error_type);
    setValue("position", data.position.toString());
    setValue("supplier", data.supplier_id?.toString());
    setValue("task", data.task_id?.toString());
    setValue("user", data.employee_id?.toString());

    getSuppliers();
    getCategories();
    getRoles();
    getTasks();
    getUsers();
  }, [data, setValue]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    const response = await editItem(d, data?.id, fileIds);
    if (response?.error) {
      toast({
        description: `Errore! ${response.error}`,
      });
    } else {
      handleClose(false);
      toast({
        description: `Elemento ${d.errorType} aggiornato correttamente!`,
      });
      form.reset();
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
                  <SearchSelect
                    {...field}
                    onChange={(e) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(e);
                    }}
                    disabled={isSubmitting}
                  >
                    {users.map((user: User) => (
                      <SearchSelectItem
                        key={user.id}
                        value={user.id.toString()}
                      >
                        {user.given_name + " " + user.family_name}
                      </SearchSelectItem>
                    ))}
                  </SearchSelect>
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
                  <SearchSelect
                    {...field}
                    onChange={(e) => {
                      // This ensures that the selected value updates the react-hook-form state
                      field.onChange(e);
                    }}
                    disabled={isSubmitting}
                  >
                    <SearchSelectItem value="fornitore">
                      Fornitore
                    </SearchSelectItem>
                    <SearchSelectItem value="reparto">Reparto</SearchSelectItem>
                  </SearchSelect>
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
                    <SearchSelect
                      {...field}
                      onChange={(e) => {
                        // This ensures that the selected value updates the react-hook-form state
                        field.onChange(e);
                      }}
                      disabled={isSubmitting}
                    >
                      {form.watch("errorCategory") === "fornitore"
                        ? categories.map((category: Product_category) => (
                            <SearchSelectItem
                              key={category.id}
                              value={category.name.toLowerCase()}
                            >
                              {category.name}
                            </SearchSelectItem>
                          ))
                        : roles.map((role) => (
                            <SearchSelectItem
                              key={role.id}
                              value={role.id.toString()}
                            >
                              {role.name}
                            </SearchSelectItem>
                          ))}
                    </SearchSelect>
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
                      <SearchSelect
                        {...field}
                        onChange={(e) => {
                          // This ensures that the selected value updates the react-hook-form state
                          field.onChange(e);
                        }}
                        disabled={isSubmitting}
                      >
                        {suppliers
                          .filter(
                            (supplier: Supplier) =>
                              supplier.category?.toLowerCase() ===
                              form.watch("errorType")?.toLowerCase()
                          )
                          .map((supplier: Supplier) => (
                            <SearchSelectItem
                              key={supplier.id}
                              value={supplier.id.toString()}
                            >
                              {supplier.name}
                            </SearchSelectItem>
                          ))}
                      </SearchSelect>
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
            {uploaded !== null && (
              <span className="text-red-500 text-xs">Foto richiesta</span>
            )}
            <p>Foto caricate:</p>
            {/* @ts-ignore */}
            {data.files.map((file: any) => (
              <Image
                key={file.cloudinaryId}
                src={file.url}
                width={100}
                height={100}
                alt={file.name}
              />
            ))}
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

export default EditProductForm;
