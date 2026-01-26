"use client";
import React, { useState } from "react";
import { faWarning } from "@fortawesome/free-solid-svg-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { validation } from "../../validation/errorTracking/create";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useToast } from "../ui/use-toast";
import { logger } from "@/lib/logger";
import {
  FileUpload,
  UploadedFile,
  UploadedFilesList,
} from "@/components/ui/file-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { SearchSelect } from "../ui/search-select";
import { Textarea } from "../ui/textarea";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { z } from "zod";
import { Button } from "../ui/button";

// Define types based on Supabase schema
interface Task {
  id: number;
  unique_code?: string;
  title?: string;
  Client?: {
    businessName?: string;
    individualFirstName?: string;
    individualLastName?: string;
  };
}

interface Roles {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
  supplier_category?: {
    name?: string;
  };
}

interface Product_category {
  id: number;
  name: string;
}

interface Session {
  user: {
    sub: string;
    given_name?: string;
  };
}

// Helper function to get project display label
const getProjectLabel = (task: Task): string => {
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

function MobilePage({
  session,
  data,
}: {
  session: Session;
  data: {
    tasks: Task[];
    roles: Roles[];
    suppliers: Supplier[];
    categories: Product_category[];
  };
}) {
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      errorCategory: "fornitore",
      user: session.user.sub,
      description: "",
      errorType: "",
      supplier: "",
      task: "",
    },
  });

  const { isSubmitting, errors } = form.formState;

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileIds, setFileIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  const handleUploadComplete = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
    setFileIds((prev) => [...prev, file.id]);
  };

  const handleUploadError = (errorMsg: string) => {
    setError(errorMsg);
    toast({
      description: `Errore upload: ${errorMsg}`,
      variant: "destructive",
    });
  };

  // console.log("error", errors);
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // console.log(data);
    fetch("/api/error-tracking/create", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ ...data, fileIds: fileIds ? fileIds : null }),
    })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          setError(data.message);
          toast({
            description: `Errore! ${data.error}`,
          });
        } else {
          toast({
            description: "Report creato correttamente.",
          });
          setTimeout(() => {
            location.reload();
          }, 1000);
        }
      });
  };

  const onNextStep = async () => {
    const isFormValid = await form.trigger(); // Validate all fields
    if (isFormValid) {
      setStep((currentStep) => currentStep + 1); // Proceed only if valid
    } else {
      toast({
        description: "Correggi gli errori prima di procedere",
      });
    }
  };

  logger.debug(errors);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          Segnalazione Errori - Step {step} di 3
        </h2>
        <p className="mt-2 text-muted-foreground">
          Compila il form per segnalare un errore
        </p>
        {error && (
          <div className="mt-4 p-4 rounded-md bg-destructive/15 text-destructive flex items-center">
            <FontAwesomeIcon icon={faWarning} className="mr-2" />
            {error}
          </div>
        )}
      </div>

      {step === 1 && (
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              name="errorCategory"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria errore</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fornitore">Fornitore</SelectItem>
                      <SelectItem value="reparto">Reparto</SelectItem>
                    </SelectContent>
                  </Select>
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
                      options={data.tasks.map((t: Task) => ({
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

            <FormField
              name="errorType"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo errore</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo errore" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {form.watch("errorCategory") === "fornitore"
                        ? data.categories.map((category: Product_category) => (
                            <SelectItem
                              key={category.id}
                              value={category.name.toLowerCase()}
                            >
                              {category.name}
                            </SelectItem>
                          ))
                        : data.roles.map((role) => (
                            <SelectItem
                              key={role.id}
                              value={role.id.toString()}
                            >
                              {role.name}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("errorCategory") !== "reparto" && (
              <FormField
                name="supplier"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornitore</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona fornitore" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end pt-4">
              <Button type="button" onClick={onNextStep}>
                Prossimo
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === 2 && (
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Foto</label>
              <FileUpload
                onUploadComplete={handleUploadComplete}
                onError={handleUploadError}
                accept="image/*"
                multiple
              />
              <UploadedFilesList files={uploadedFiles} />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Indietro
              </Button>
              <Button type="button" onClick={onNextStep}>
                Prossimo
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Verifica i dati immessi</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Categoria errore
              </dt>
              <dd className="mt-1">{form.watch("errorCategory")}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Progetto
              </dt>
              <dd className="mt-1">
                {(() => {
                  const task = data.tasks.find(
                    (t: Task) => t.id.toString() === form.watch("task")
                  );
                  return task ? getProjectLabel(task) : "Sconosciuto";
                })()}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Utente
              </dt>
              <dd className="mt-1">{session.user.given_name}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Tipo Errore
              </dt>
              <dd className="mt-1">
                {data.categories.find(
                  (category: Product_category) =>
                    category.id.toString() == form.watch("errorType")
                )?.name || form.watch("errorType")}
              </dd>
            </div>

            {form.watch("errorCategory") === "fornitore" && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Fornitore
                </dt>
                <dd className="mt-1">
                  {data.suppliers.find(
                    (supplier: Supplier) =>
                      supplier.id.toString() == form.watch("supplier")
                  )?.name || "Sconosciuto"}
                </dd>
              </div>
            )}

            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">
                Descrizione
              </dt>
              <dd className="mt-1">{form.watch("description") || "-"}</dd>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground mb-2">
                  Foto
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {uploadedFiles.map((photo) => (
                    <Image
                      key={photo.id}
                      src={photo.url}
                      alt={photo.name}
                      width={100}
                      height={100}
                      className="rounded-md object-cover"
                    />
                  ))}
                </dd>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Indietro
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? "Invio in corso..." : "Conferma e concludi"}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-green-600">
            Errore segnalato correttamente!
          </h2>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded-lg">
            <p>Invio in corso...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobilePage;
