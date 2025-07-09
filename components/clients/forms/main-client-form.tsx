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
import { CountryCombo } from "../../../app/(user)/clients/countryCombo";

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
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Informazioni Cliente</h2>

      {/* Client Type Selection */}
      <FormField
        control={form.control}
        name="clientType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipologia</FormLabel>
            <FormControl>
              <RadioGroup
                {...field}
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="INDIVIDUAL" />
                  </FormControl>
                  <FormLabel className="font-normal">Privato</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="BUSINESS" />
                  </FormControl>
                  <FormLabel className="font-normal">Azienda</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Individual Client Fields */}
      {watchClientType === "INDIVIDUAL" && (
        <div className="space-y-4">
          <FormField
            name="individualTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titolo</FormLabel>
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
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    
                    disabled={isSubmitting}
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
                <FormLabel>Cognome</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Business Client Fields */}
      {watchClientType === "BUSINESS" && (
        <FormField
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome azienda</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Common Fields */}
      <div className="space-y-4">
        <FormField
          name="clientLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lingua</FormLabel>
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
                  {languages.map((lan) => (
                    <SelectItem key={lan.id} value={lan.name}>
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
          <h3 className="text-md font-medium">Indirizzo Principale</h3>
          <FormField
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Indirizzo <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-row gap-2">
            <FormField
              name="countryCode"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>
                    Paese <span className="text-red-500">*</span>
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
                <FormItem className="flex-1">
                  <FormLabel>
                    CAP <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      
                      {...field}
                      disabled={isSubmitting}
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
                <FormLabel>
                  Città <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contact Information */}
        <div className="flex flex-row gap-2">
          <FormField
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
