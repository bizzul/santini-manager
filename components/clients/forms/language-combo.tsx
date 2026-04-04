"use client";

import { useState } from "react";
import Image from "next/image";
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

export const CLIENT_LANGUAGES = [
  { value: "Italiano", label: "Italiano", countryCode: "it" },
  { value: "Tedesco", label: "Tedesco", countryCode: "de" },
  { value: "Francese", label: "Francese", countryCode: "fr" },
  { value: "Inglese", label: "Inglese", countryCode: "gb" },
] as const;

export function LanguageCombo({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedLanguage = CLIENT_LANGUAGES.find(
    (language) => language.value === value
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-8 w-full justify-between"
        >
          {selectedLanguage ? (
            <span className="flex items-center gap-2 truncate">
              <Image
                src={`https://flagcdn.com/w20/${selectedLanguage.countryCode}.png`}
                alt={selectedLanguage.label}
                width={20}
                height={15}
                className="h-auto w-auto shrink-0 rounded-sm"
              />
              <span className="truncate">{selectedLanguage.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Seleziona lingua</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cerca lingua..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nessuna lingua trovata.</CommandEmpty>
            <CommandGroup>
              {CLIENT_LANGUAGES.map((language) => (
                <CommandItem
                  key={language.value}
                  value={`${language.label} ${language.value}`}
                  onSelect={() => {
                    onChange(language.value);
                    setOpen(false);
                  }}
                >
                  <Image
                    src={`https://flagcdn.com/w20/${language.countryCode}.png`}
                    alt={language.label}
                    width={20}
                    height={15}
                    className="h-auto w-auto shrink-0 rounded-sm"
                  />
                  <span>{language.label}</span>
                  {language.value === value ? (
                    <Check className="ml-auto h-4 w-4" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
