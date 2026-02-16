"use client";
import React, { useEffect, useOptimistic, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { validation } from "@/validation/errorTracking/create";
import { useToast } from "@/components/ui/use-toast";
import { useFormStatus } from "react-dom";
import {
  Product_category,
  Roles,
  Supplier,
  Task,
  User,
} from "@/types/supabase";
import { editItem } from "./actions/edit-item.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import {
  FileUpload,
  UploadedFile,
  UploadedFilesList,
} from "@/components/ui/file-upload";
import Image from "next/image";

// Extended Task type for edit form that includes client data
interface TaskWithClient extends Task {
  Client?: {
    businessName?: string;
    individualFirstName?: string;
    individualLastName?: string;
  };
}

// Helper function to get project display label
const getProjectLabel = (task: TaskWithClient): string => {
  const clientName = task.Client?.businessName ||
    (task.Client?.individualFirstName && task.Client?.individualLastName
      ? `${task.Client.individualFirstName} ${task.Client.individualLastName}`
      : null);
  
  if (clientName) {
    return `${task.unique_code} - ${clientName}`;
  }
  return task.title
    ? `${task.unique_code} - ${task.title}`
    : task.unique_code || "";
};

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
      supplier: "",
      task: "",
      materialCost: undefined,
      timeSpentHours: undefined,
      transferKm: undefined,
    },
  });
  const { setValue } = form;
  const { isSubmitting, errors } = form.formState;
  const { pending } = useFormStatus();

  const [categories, setCategories] = useState<Product_category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [roles, setRoles] = useState<Roles[]>([]);
  const [tasks, setTasks] = useState<TaskWithClient[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileIds, setFileIds] = useState<number[]>([]);

  const handleUploadComplete = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
    setFileIds((prev) => [...prev, file.id]);
  };

  const handleUploadError = (error: string) => {
    toast({ description: `Errore upload: ${error}`, variant: "destructive" });
  };

  useEffect(() => {
    const getSuppliers = async () => {
      const d = await fetch(`../api/suppliers/`);
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
        const response = await fetch(`../api/tasks/?include=client`);
        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }
        const tasksData = await response.json();
        setTasks(tasksData);
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
    setValue("supplier", data.supplier_id?.toString());
    setValue("task", data.task_id?.toString());
    setValue("user", data.employee_id?.toString());
    setValue("materialCost", data.material_cost ?? "");
    setValue("timeSpentHours", data.time_spent_hours ?? "");
    setValue("transferKm", data.transfer_km ?? "");

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
                      {users.map((user: User) => (
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
                    <SearchSelect
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                      options={tasks.map((t: TaskWithClient) => ({
                        value: t.id.toString(),
                        label: getProjectLabel(t),
                      }))}
                      placeholder="Cerca progetto..."
                    />
                  </FormControl>
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
                          ? categories.map((category: Product_category) => (
                              <SelectItem
                                key={category.id}
                                value={category.name?.toLowerCase() || ""}
                              >
                                {category.name || "Unnamed"}
                              </SelectItem>
                            ))
                          : roles.map((role) => (
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
                          {suppliers
                            .filter(
                              (supplier: Supplier) =>
                                supplier.supplier_category?.name?.toLowerCase() ===
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            name="materialCost"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo materiale (CHF)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="es. 50"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="timeSpentHours"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tempo impiegato (Ore)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="es. 2.5"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="transferKm"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>KM trasferta supplementare</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="1"
                    min="0"
                    placeholder="es. 60"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="col-span-3 sm:col-span-2">
            <label className="block text-sm font-medium mb-2">Foto</label>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
              accept="image/*"
              multiple
            />
            <UploadedFilesList files={uploadedFiles} />
            {data.files && data.files.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Foto esistenti:</p>
                <div className="flex flex-wrap gap-2">
                  {data.files.map((file: any) => (
                    <Image
                      key={file.id}
                      src={file.url}
                      width={100}
                      height={100}
                      alt={file.name}
                      className="rounded-md"
                    />
                  ))}
                </div>
              </div>
            )}
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
