import { FC, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { validation } from "../../../validation/clients/create";
import { ClientAddressType } from "../client-type-definitions";
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
import { Checkbox } from "../../../components/ui/checkbox";
import { CountryCombo } from "../../../app/(user)/clients/countryCombo";
//@ts-ignore
import GoogleAutocomplete from "../google-autocomplete.js";
import { jobsType } from "../jobs";

type FormData = z.infer<typeof validation>;

interface AddressFormProps {
  type: ClientAddressType;
  form: UseFormReturn<FormData>;
  isSubmitting: boolean;
  errors: any;
  showSameAsMainOption?: boolean;
  sameAsMain?: boolean;
}

export const AddressForm: FC<AddressFormProps> = ({
  type,
  form,
  isSubmitting,
  errors,
  showSameAsMainOption = false,
  sameAsMain = false,
}) => {
  const prefix =
    type === ClientAddressType.CONSTRUCTION_SITE
      ? "CONSTRUCTION_SITE"
      : "OTHER";

  return (
    <div className="space-y-4">
      {showSameAsMainOption && (
        <FormField
          name={`${prefix}_sameAsMain`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Uguale a cantiere</FormLabel>
              </div>
            </FormItem>
          )}
        />
      )}

      {(!showSameAsMainOption || !sameAsMain) && (
        <div className="space-y-4">
          {type === ClientAddressType.CONSTRUCTION_SITE && (
            <p className="text-sm text-gray-500 italic">
              Tutti i campi sono opzionali
            </p>
          )}
          <GoogleAutocomplete setValue={form.setValue} type={type} />

          <FormField
            name={`${prefix}_typeDetail`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Tipo{" "}
                  {type === ClientAddressType.CONSTRUCTION_SITE &&
                    "(opzionale)"}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue  />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {jobsType.map((job) => (
                      <SelectItem key={job.value} value={job.value}>
                        {job.renderValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={`${prefix}_name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nome{" "}
                  {type === ClientAddressType.CONSTRUCTION_SITE &&
                    "(opzionale)"}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={`${prefix}_lastName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Cognome{" "}
                  {type === ClientAddressType.CONSTRUCTION_SITE &&
                    "(opzionale)"}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={`${prefix}_address`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Indirizzo{" "}
                  {type === ClientAddressType.CONSTRUCTION_SITE &&
                    "(opzionale)"}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name={`${prefix}_addressExtra`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Indirizzo extra{" "}
                  {type === ClientAddressType.CONSTRUCTION_SITE &&
                    "(opzionale)"}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-row gap-2">
            <FormField
              name={`${prefix}_countryCode`}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    Paese{" "}
                    {type === ClientAddressType.CONSTRUCTION_SITE &&
                      "(opzionale)"}
                  </FormLabel>
                  <FormControl>
                    <CountryCombo field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${prefix}_zipCode`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    CAP{" "}
                    {type === ClientAddressType.CONSTRUCTION_SITE &&
                      "(opzionale)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(
                          value === "" ? undefined : Number(value)
                        );
                      }}
                      value={field.value === undefined ? "" : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            name={`${prefix}_city`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Città{" "}
                  {type === ClientAddressType.CONSTRUCTION_SITE &&
                    "(opzionale)"}
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              name={`${prefix}_latitude`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Latitudine{" "}
                    {type === ClientAddressType.CONSTRUCTION_SITE &&
                      "(opzionale)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${prefix}_longitude`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Longitudine{" "}
                    {type === ClientAddressType.CONSTRUCTION_SITE &&
                      "(opzionale)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-row gap-2">
            <FormField
              name={`${prefix}_phone`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Telefono{" "}
                    {type === ClientAddressType.CONSTRUCTION_SITE &&
                      "(opzionale)"}
                  </FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${prefix}_mobile`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Cellulare{" "}
                    {type === ClientAddressType.CONSTRUCTION_SITE &&
                      "(opzionale)"}
                  </FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            name={`${prefix}_email`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email{" "}
                  {type === ClientAddressType.CONSTRUCTION_SITE &&
                    "(opzionale)"}
                </FormLabel>
                <FormControl>
                  <Input type="email" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
};
