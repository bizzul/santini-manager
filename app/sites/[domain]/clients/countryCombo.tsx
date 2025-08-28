"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { countries } from "@/components/clients/countries";
import { useState } from "react";

export function CountryCombo({ field }: { field: any }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between"
        >
          {field.value
            ? countries.find((country) => country.code === field.value)?.label
            : "Seleziona una nazione..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0 z-50 pointer-events-auto cursor-pointer"
        side="bottom"
        align="start"
        sideOffset={4}
        alignOffset={0}
      >
        <Command>
          <CommandInput className="h-9" />
          <CommandList>
            <CommandEmpty>Nessuna nazione trovata.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.code}
                  onSelect={(currentValue: any) => {
                    field.onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Image
                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                    alt={country.code}
                    width={20}
                    height={20}
                    className="w-auto h-auto"
                  />
                  {country.label}
                  {country.code === field.value && (
                    <Check className="ml-auto opacity-100" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
