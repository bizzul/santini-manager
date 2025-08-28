import { FC } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { validation } from "../../../validation/clients/create";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { CountryCombo } from "@/app/sites/[domain]/clients/countryCombo";

type FormData = z.infer<typeof validation>;

interface MainClientFormProps {
  form: UseFormReturn<FormData>;
  watchClientType: string;
  isSubmitting: boolean;
}

const languages = [
  { id: 1, name: "Italiano" },
  { id: 2, name: "Tedesco" },
  { id: 3, name: "Francese" },
  { id: 4, name: "Inglese" },
];

export const MainClientForm: FC<MainClientFormProps> = ({
  form,
  watchClientType,
  isSubmitting,
}) => {
  return (
    <div className="space-y-4 bg-card">
      <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
        Informazioni
      </h2>

      {/* Client Type Selection */}

      <FormField
        control={form.control}
        name="clientType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium text-foreground mb-3 block">
              Tipologia
            </FormLabel>
            <FormControl>
              <RadioGroup
                {...field}
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
                className="flex space-x-6"
              >
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="INDIVIDUAL" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer text-foreground">
                    Privato
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="BUSINESS" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer text-foreground">
                    Azienda
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Individual Client Fields */}
      {watchClientType === "INDIVIDUAL" && (
        <div className="bg-card  space-y-4">
          <h3 className="text-lg font-medium text-foreground mb-4">Dati</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="individualTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Titolo
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona titolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Sig.">Sig.</SelectItem>
                      <SelectItem value="Sig.ra">Sig.ra</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="individualFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Nome
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="individualLastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Cognome
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {/* Business Client Fields */}
      {watchClientType === "BUSINESS" && (
        <div className="">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Dati aziendali
          </h3>
          <FormField
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  Nome azienda
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Common Fields */}
      <div className="bg-card  space-y-6">
        <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
          Informazioni generali
        </h3>

        <FormField
          name="clientLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Lingua
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Seleziona lingua" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {languages.map((lan) => (
                    <SelectItem
                      className="hover:bg-slate-500 dark:hover:bg-slate-500"
                      key={lan.id}
                      value={lan.name}
                    >
                      {lan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Main Address */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground flex items-center">
            Indirizzo
          </h4>

          <FormField
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  Indirizzo <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FormField
              name="countryCode"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-foreground mb-2">
                    Paese <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <CountryCombo field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="zipCode"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-foreground mb-2">
                    CAP <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      disabled={isSubmitting}
                      className="w-full h-10"
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : Number(value));
                      }}
                      value={field.value === null ? "" : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  Città <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground flex items-center">
            {/* <span className="w-2 h-2  rounded-full mr-2"></span> */}
            Informazioni di contatto
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      disabled={isSubmitting}
                      className="w-full"
                      placeholder="esempio@email.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Telefono
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      disabled={isSubmitting}
                      className="w-full"
                      placeholder="+39 123 456 7890"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
