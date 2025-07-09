import {
  faIdBadge,
  faQuestion,
  faSave,
  faSignIn,
  faTimes,
  faUserPlus,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/clients/create";
import { countries } from "./countries";
import { ClientAddresses } from "./create-addresses";
import { ClientAddressType } from "./client-type-definitions";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { z } from "zod";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormData = z.infer<typeof validation>;

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  setOpenModal: Dispatch<React.SetStateAction<boolean>>;
};

export const CreateModal: FC<Props> = ({ open, setOpen, setOpenModal }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(validation),
    defaultValues: {
      individualTitle: "",
      businessName: "",
      individualFirstName: "",
      individualLastName: "",
      address: "",
      city: "",
      clientType: "",
      countryCode: "",
      email: "",
      clientLanguage: "",
      zipCode: undefined,
    },
  });

  const languages = [
    {
      id: 1,
      name: "Italiano",
    },
    {
      id: 2,
      name: "Tedesco",
    },
    {
      id: 3,
      name: "Francese",
    },
    {
      id: 4,
      name: "Inglese",
    },
  ];

  const watchClientType = form.watch("clientType");

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.error) {
        setError(result.message);
      } else if (result.issues) {
        setError("Invalid data found.");
      } else {
        setOpen(false);
        setOpenModal(false);
      }
    } catch (err) {
      setError("An error occurred while creating the client.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuovo Cliente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="px-6 pt-5">
                <div className="w-full p-4 rounded bg-red-500 text-white flex-row items-middle">
                  <FontAwesomeIcon icon={faWarning} className="mr-2" />
                  {error}
                </div>
              </div>
            )}
            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
                <h1 className="text-lg font-bold flex-row text-slate-500">
                  <FontAwesomeIcon icon={faSignIn} className="mr-2" />
                  Informazioni principali
                </h1>
                <div className="flex flex-row gap-8 items-center">
                  <Label>Tipologia</Label>
                  <FormField<FormData>
                    control={form.control}
                    name="clientType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value?.toString() || ""}
                            className="flex flex-row gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="INDIVIDUAL"
                                id="individual"
                              />
                              <Label htmlFor="individual">Privato</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="BUSINESS" id="business" />
                              <Label htmlFor="business">Azienda</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                  {watchClientType === "INDIVIDUAL" && (
                    <FormField<FormData>
                      control={form.control}
                      name="individualTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titolo</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Mr">Mr</SelectItem>
                              <SelectItem value="Mrs">Mrs</SelectItem>
                              <SelectItem value="Ms">Ms</SelectItem>
                              <SelectItem value="Dr">Dr</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {watchClientType === "BUSINESS" && (
                    <FormField<FormData>
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Azienda</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value?.toString() || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField<FormData>
                    control={form.control}
                    name="individualFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value?.toString() || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField<FormData>
                    control={form.control}
                    name="individualLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value?.toString() || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField<FormData>
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cellulare</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            value={field.value?.toString() || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField<FormData>
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Città</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value?.toString() || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField<FormData>
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indirizzo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value?.toString() || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField<FormData>
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            value={field.value?.toString() || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField<FormData>
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAP</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value?.toString() || ""}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="countryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stato</FormLabel>
                        <FormControl>
                          <Select
                            disabled={loading}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.code}
                                >
                                  <div className="flex items-center gap-2">
                                    <Image
                                      src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                      alt={country.code}
                                      width={20}
                                      height={20}
                                    />
                                    <span>{country.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField<FormData>
                    control={form.control}
                    name="clientLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lingua</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="it">Italiano</SelectItem>
                            <SelectItem value="de">Tedesco</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg shadow-xl flex-row bg-white mb-3">
                <h1 className="text-lg font-bold flex-row text-slate-500">
                  <FontAwesomeIcon icon={faIdBadge} className="mr-2" />
                  Indirizzi
                </h1>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div>
                    <ClientAddresses
                      type={ClientAddressType.CONSTRUCTION_SITE}
                      form={form}
                      isSubmitting={loading}
                      errors={form.formState.errors}
                    />
                  </div>
                  <div>
                    <ClientAddresses
                      showSameAsMainOption
                      type={ClientAddressType.OTHER}
                      form={form}
                      isSubmitting={loading}
                      errors={form.formState.errors}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {!loading && (
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-green-500"
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" /> Salva
                </Button>
              )}

              {loading && (
                <div className="rounded-md border shadow-sm flex gap-1 px-4 py-2 text-slate-500 text-base font-medium">
                  <div
                    className="w-5 h-5 
                  border-4
                  border-t-slate-500
                  mt-0.5  
                  mr-2
                  rounded-full 
                  animate-spin"
                  ></div>
                  Salvataggio in corso...
                </div>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
