"use client";
import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/errorTracking/create";
import { useToast } from "@/components/ui/use-toast";
import { Product_category, Supplier } from "@/types/supabase";
import {
  FileUpload,
  UploadedFile,
  UploadedFilesList,
} from "@/components/ui/file-upload";

// Helper function to get project display label
const getProjectLabel = (task: any): string => {
  const clientName =
    task.Client?.businessName ||
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

const CreateProductForm = ({
  handleClose,
  data,
}: {
  handleClose: any;
  data: any;
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const domain = pathname?.split("/")[2] || "";

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      errorCategory: "fornitore",
      description: "",
      errorType: "",
      supplier: "",
      task: "",
      position: "",
      materialCost: undefined,
      timeSpentHours: undefined,
      transferKm: undefined,
    },
  });

  const { isSubmitting, errors } = form.formState;
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileIds, setFileIds] = useState<number[]>([]);

  const handleUploadComplete = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
    setFileIds((prev) => [...prev, file.id]);
  };

  const handleUploadError = (error: string) => {
    toast({ description: `Errore upload: ${error}`, variant: "destructive" });
  };

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      const dataObject = { data: d, fileIds: fileIds };
      const res = await createItem(dataObject, domain);
      //@ts-ignore
      if (res?.error === true) {
        toast({
          variant: "destructive",
          //@ts-ignore
          description: `Errore! ${res?.message || "Creazione fallita"}`,
        });
        return;
      }
      handleClose(false);
      toast({
        description: `Elemento ${d.errorType || "errore"} creato correttamente!`,
      });
      form.reset();
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        description: `Errore nel creare l'elemento! ${e}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Prima riga: Categoria errore e Progetto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            name="errorCategory"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria errore</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset dependent fields when category changes
                      form.setValue("errorType", "");
                      form.setValue("supplier", "");
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
                <FormMessage />
              </FormItem>
            )}
          />

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
                    options={data.tasks.map((t: any) => ({
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

        {/* Seconda riga: Tipo errore e Fornitore (se categoria = fornitore) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            name="errorType"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo errore</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset supplier when error type changes
                      form.setValue("supplier", "");
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {form.watch("errorCategory") === "fornitore"
                        ? data.categories.map((category: Product_category) => (
                            <SelectItem
                              key={category.id}
                              value={category.name?.toLowerCase() || ""}
                            >
                              {category.name || "Unnamed"}
                            </SelectItem>
                          ))
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
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("errorCategory") === "fornitore" && (
            <FormField
              name="supplier"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornitore</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      onValueChange={field.onChange}
                      disabled={isSubmitting || !form.watch("errorType")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona fornitore..." />
                      </SelectTrigger>
                      <SelectContent>
                        {data.suppliers
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Posizione (opzionale) */}
        <FormField
          name="position"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Posizione (opzionale)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="es. pos. 1"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descrizione */}
        <FormField
          name="description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="Descrivi l'errore..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campi opzionali */}
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

        {/* Foto */}
        <div>
          <label className="block text-sm font-medium mb-2">Foto</label>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
            accept="image/*"
            bucket="files"
            multiple
          />
          <UploadedFilesList files={uploadedFiles} />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm mr-1"></span>
          )}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default CreateProductForm;
