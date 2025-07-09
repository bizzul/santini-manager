import { FC, useEffect } from "react";
import { ClientAddressType } from "./client-type-definitions";
//@ts-ignore
import GoogleAutocomplete from "./google-autocomplete.js";
import { countries } from "./countries";
import { jobsType } from "./jobs";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import Image from "next/image";
type Props = {
  type: ClientAddressType;
  form: any;
  showSameAsMainOption?: Boolean;
  isSubmitting: boolean;
  errors: any;
};
/**
 * Client Editor Form
 * All the hooks related to CRUD operations are inside this component.
 * @returns
 */
export const ClientAddresses: FC<Props> = ({
  type,
  form,
  showSameAsMainOption = false,
  isSubmitting,
}) => {
  const watchSameAsMainOption = form.watch(`${type}_sameAsMain`, true);

  useEffect(() => {
    form.setValue(`${type}_sameAsMain`, true);
  }, [form, type]);

  return (
    <div className="  pb-4">
      <div className="mx-2 my-2">
        <div className="flex flex-row justify-between">
          <h1 className="text-xl pb-4">{`${
            type === "CONSTRUCTION_SITE" ? "Cantiere" : "Altro"
          }`}</h1>
          {showSameAsMainOption && (
            <FormField
              name={`${type}_sameAsMain`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uguale a cantiere</FormLabel>
                  <FormControl>
                    <input defaultChecked type="checkbox" {...field} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div
          className={`${
            watchSameAsMainOption && showSameAsMainOption ? "hidden" : "block"
          }`}
        >
          <div className="w-full grid grid-cols-1  gap-4 pt-4">
            <div>
              <GoogleAutocomplete setValue={form.setValue} type={type} />
            </div>
            <div>
              <FormField
                name={`${type}_typeDetail`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isSubmitting}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue  />
                        </SelectTrigger>
                        <SelectContent>
                          {jobsType.map((job) => (
                            <SelectItem key={job.value} value={job.value}>
                              {job.renderValue}
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
            </div>

            <FormField
              name={`${type}_name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_lastName`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cognome</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_zipCode`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAP</FormLabel>
                  <FormControl>
                    <Input {...field} type={"number"} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_latitude`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl>
                    <Input {...field} type={"number"} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_longitude`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl>
                    <Input {...field} type={"number"} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_city`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Città</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_address`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_addressExtra`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo Extra</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_phone`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_mobile`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cellulare</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_email`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" disabled={isSubmitting} />
                  </FormControl>
                  {/* <FormDescription>Fornitore del prodotto</FormDescription> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={`${type}_countryCode`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isSubmitting}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue  />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
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
          </div>
        </div>
      </div>
    </div>
  );
};
