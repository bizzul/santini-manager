"use client";
import React, { useState } from "react";
import { faWarning } from "@fortawesome/free-solid-svg-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { validation } from "../../validation/errorTracking/create";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CldUploadButton } from "next-cloudinary";
import Image from "next/image";
import { useToast } from "../ui/use-toast";
import { SearchSelect, SearchSelectItem, Textarea } from "@tremor/react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { z } from "zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

// Define types based on Supabase schema
interface Task {
  id: number;
  unique_code?: string;
}

interface Roles {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
  category?: string;
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
      position: "",
      supplier: "",
      task: "",
    },
  });

  const { isSubmitting, errors } = form.formState;

  const [uploaded, setUploadedFile] = useState<File[] | null | []>([]);
  const [fileIds, setFileIds] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const { toast } = useToast();

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

  const handleUpload = (result: any) => {
    if (result) {
      // console.log("risultato", result);
      setLoading(true);
      fetch("/api/files/create", {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(result.info),
      })
        .then((response) => response.json())
        .then((data) => {
          setLoading(false);
          if (data.error) {
            setError(data.message);
          } else if (data.issues) {
            setError("Invalid data found.");
          } else {
            setUploadedFile((current: any) => [...current, data.result]);
            setFileIds((current: any) => [...current, data.result.id]);
          }
        });
    }
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

  console.log(errors);

  return (
    <div>
      <div className="flex justify-center w-auto h-auto flex-col items-center  ">
        <div className="py-4 md:w-1/2 w-full  md:px-0 px-10">
          <h2 className="md:text-3xl  text-sm font-extrabold ">
            Step {step} di 3
          </h2>
          <p className="mt-4 text-lg ">Form per la segnalazione errori</p>
          {error && (
            <div className="px-6 pt-5">
              <div className="w-full p-4 rounded-sm bg-red-500  flex-row items-middle">
                <FontAwesomeIcon icon={faWarning} className="mr-2" />
                {error}
              </div>
            </div>
          )}
        </div>
        {step === 1 && (
          <Form {...form}>
            <form
              className="space-y-4 "
              // onSubmit={form.handleSubmit(() => setStep(2))}
            >
              <div className="shadow sm:rounded-md sm:overflow-hidden">
                <div className="grid grid-cols-1 gap-6">
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
                            <SearchSelectItem value="reparto">
                              Reparto
                            </SearchSelectItem>
                          </SearchSelect>
                        </FormControl>
                        {/* <FormDescription>Categoria del prodotto</FormDescription> */}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-6 z-20">
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
                            {data.tasks.map((t: Task) => (
                              <SearchSelectItem
                                key={t.id}
                                value={t.id.toString()}
                              >
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

                <div className="grid grid-cols-1 gap-6 z-20">
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
                              ? data.categories.map(
                                  (category: Product_category) => (
                                    <SearchSelectItem
                                      key={category.id}
                                      value={category.name.toLowerCase()}
                                    >
                                      {category.name}
                                    </SearchSelectItem>
                                  )
                                )
                              : data.roles.map((role) => (
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
                              {data.suppliers
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
              <div className="px-4 py-3  text-right sm:px-6 ">
                <Button
                  type="button"
                  onClick={onNextStep}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md  bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Prossimo
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...form}>
            <form
              // onSubmit={form.handleSubmit(() => setStep(3))}
              className="md:w-1/2 w-full px-6   h-screen "
            >
              <div className=" sm:rounded-md sm:overflow-hidden  ">
                <div className="px-4 py-5  space-y-6 sm:p-6">
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
                        className="block text-sm font-medium "
                      >
                        Foto
                      </label>
                      <div className="mt-1 flex flex-row gap-4 rounded-md shadow-xs">
                        <div className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md  bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                          <CldUploadButton
                            uploadPreset="uploadpdf"
                            onUpload={(result: any) => handleUpload(result)}
                            options={{
                              sources: ["local", "camera"],
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
                                <li
                                  key={file.id}
                                >{`${file.id} - ${file.name}`}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {uploaded !== null && (
                        <span className="text-red-500 text-xs">
                          Foto richiesta
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3  text-right sm:px-6">
                  <Button
                    type="button"
                    className="inline-flex justify-center py-2 px-4 border  bg-transparent shadow-xs text-sm font-medium rounded-md   focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => setStep(1)}
                  >
                    Precedente
                  </Button>
                  <Button
                    onClick={onNextStep}
                    type="button"
                    className="ml-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md  bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Prossimo
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
        {step === 3 && (
          <div className="md:h-screen h-auto my-8 ">
            <h2 className="text-2xl font-bold leading-7 sm:text-3xl sm:truncate">
              Verifica i dati immessi
            </h2>
            <div className="mt-6   px-4 py-5 sm:rounded-lg sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 ">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Categoria errore
                  </dt>
                  <dd className="mt-1 text-sm ">
                    {form.watch("errorCategory")}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium ">Progetto</dt>
                  <dd className="mt-1 text-sm ">
                    {data.tasks.find(
                      (task: Task) => task.id.toString() === form.watch("task")
                    )?.unique_code || "Sconosciuto"}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium ">Utente</dt>
                  <dd className="mt-1 text-sm ">{session.user.given_name}</dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium ">Tipo Errore</dt>
                  <dd className="mt-1 text-sm ">
                    {data.categories.find(
                      (category: Product_category) =>
                        category.id.toString() == form.watch("errorType")
                    )?.name || form.watch("errorType")}
                  </dd>
                </div>
                {form.watch("errorCategory") === "fornitore" && (
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium ">Fornitore</dt>
                    <dd className="mt-1 text-sm ">
                      {data.suppliers.find(
                        (supplier: Supplier) =>
                          supplier.id.toString() == form.watch("supplier")
                      )?.name || "Sconosciuto"}
                    </dd>
                  </div>
                )}

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium ">Nr. Posizione</dt>
                  <dd className="mt-1 text-sm ">{form.watch("position")}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium ">Descrizione</dt>
                  <dd className="mt-1 text-sm ">{form.watch("description")}</dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium ">Foto</dt>
                  <dd className="mt-1 text-sm ">
                    {uploaded &&
                      uploaded.map((photo: any) => (
                        <Image
                          key={photo.url}
                          src={photo.url}
                          alt={photo.name}
                          width={150}
                          height={150}
                        />
                      ))}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-6  px-4 py-5 sm:px-6 sm:flex sm:flex-row-reverse ">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-xs px-4 py-2 bg-indigo-600 text-base font-medium  hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={form.handleSubmit(onSubmit)}
              >
                Conferma e concludi
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 bg-transparent shadow-xs px-4 py-2  text-base font-medium  hover: focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setStep(2)}
              >
                Indietro
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold leading-7  sm:text-3xl sm:truncate">
              Errore inviato correttamente!
            </h2>
          </div>
        )}

        {loading && (
          <div className="absolute top-0 left-0 w-screen h-screen bg-black/50"></div>
        )}
      </div>
    </div>
  );
}

export default MobilePage;
