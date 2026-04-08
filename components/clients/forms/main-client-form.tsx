import { FC } from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { validation } from "../../../validation/clients/create";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { CountryCombo } from "@/app/sites/[domain]/clients/countryCombo";
import { Button } from "@/components/ui/button";
import { getEmptyClientContactPerson } from "@/lib/client-contacts";
import { LanguageCombo } from "@/components/clients/forms/language-combo";

type FormData = z.infer<typeof validation>;

interface MainClientFormProps {
  form: UseFormReturn<FormData>;
  watchClientType: string;
  isSubmitting: boolean;
}

export const MainClientForm: FC<MainClientFormProps> = ({
  form,
  watchClientType,
  isSubmitting,
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contactPeople",
  });

  return (
    <div className="space-y-4 bg-card">
      <h2 className="text-md font-semibold text-foreground border-b border-border">
        Info
      </h2>

      {/* Client Type Selection */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <FormField
          control={form.control}
          name="clientType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium h-8 text-foreground mb-3 block">
                Tipo
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

        <FormField
          control={form.control}
          name="clientLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-foreground mb-3 block">
                Lingua
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <LanguageCombo
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
                      <SelectItem value="Signori">Signori</SelectItem>
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
            Ragione sociale
          </h3>
          <FormField
            name="businessName"
            render={({ field }) => (
              <FormItem>
                {/* <FormLabel className="text-sm font-medium text-foreground">
                  Nome azienda
                </FormLabel> */}
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
      <div className="bg-card  space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-border ">
          Indirizzo
        </h3>

        {/* Main Address */}
        <div className="space-y-4">
          <FormField
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  Via <span className="text-destructive">*</span>
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
            name="addressSecondary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  Indirizzo extra
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isSubmitting}
                    className="w-full"
                    placeholder="c/o, piano, interno..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FormField
              name="zipCode"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-foreground ">
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
            <FormField
              name="city"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-foreground">
                    Città <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isSubmitting}
                      className="w-full h-10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground flex items-center">
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
                      placeholder="connect@matris.pro"
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
                      placeholder="+41 79 700 12 34"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h5 className="text-sm font-medium text-foreground">
                  Persone di contatto
                </h5>
                <p className="text-xs text-muted-foreground">
                  Aggiungi uno o piu referenti e specifica il loro ruolo.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(getEmptyClientContactPerson())}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4" />
                Aggiungi persona
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                Nessuna persona di contatto inserita.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((contactField, index) => (
                  <div
                    key={contactField.id}
                    className="rounded-md border border-border/60 bg-background/40 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h6 className="text-sm font-medium text-foreground">
                        Referente {index + 1}
                      </h6>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={isSubmitting}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Rimuovi
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-medium text-foreground">
                          Nome contatto
                        </FormLabel>
                        <Input
                          {...form.register(`contactPeople.${index}.name` as const)}
                          disabled={isSubmitting}
                          placeholder="Mario Rossi"
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-medium text-foreground">
                          Ruolo
                        </FormLabel>
                        <Input
                          {...form.register(`contactPeople.${index}.role` as const)}
                          disabled={isSubmitting}
                          placeholder="Responsabile acquisti"
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-medium text-foreground">
                          Email
                        </FormLabel>
                        <Input
                          {...form.register(`contactPeople.${index}.email` as const)}
                          type="email"
                          disabled={isSubmitting}
                          placeholder="mario.rossi@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-medium text-foreground">
                          Telefono
                        </FormLabel>
                        <Input
                          {...form.register(`contactPeople.${index}.phone` as const)}
                          type="tel"
                          disabled={isSubmitting}
                          placeholder="+41 79 700 12 34"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
