"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface ReportSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface ReportMultiSelectProps {
  options: ReportSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
  maxPreview?: number;
}

export function ReportMultiSelect({
  options,
  value,
  onValueChange,
  placeholder,
  emptyMessage = "Nessun elemento trovato.",
  disabled = false,
  maxPreview = 2,
}: ReportMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOptions = React.useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) {
      return options;
    }

    const normalizedSearch = search.toLowerCase();
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [options, search]);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((currentValue) => currentValue !== optionValue));
      return;
    }

    onValueChange([...value, optionValue]);
  };

  const handleClear = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    onValueChange([]);
  };

  const handleRemove = (optionValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onValueChange(value.filter((currentValue) => currentValue !== optionValue));
  };

  const handleToggleAll = () => {
    if (value.length === options.length) {
      onValueChange([]);
      return;
    }

    onValueChange(options.map((option) => option.value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-h-[40px] h-auto justify-between"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 text-left">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedOptions.length <= maxPreview ? (
              selectedOptions.map((option) => (
                <Badge key={option.value} variant="secondary" className="gap-1">
                  <span className="max-w-[180px] truncate">{option.label}</span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={(event) => handleRemove(option.value, event)}
                  />
                </Badge>
              ))
            ) : (
              <Badge variant="secondary" className="gap-1">
                {selectedOptions.length} selezionati
                <X className="h-3 w-3 cursor-pointer" onClick={handleClear} />
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandGroup>
              {options.length > 0 && (
                <CommandItem
                  value="__all__"
                  onSelect={handleToggleAll}
                  className="cursor-pointer"
                >
                  <Checkbox checked={value.length === options.length} />
                  <span>Seleziona tutti</span>
                </CommandItem>
              )}
            </CommandGroup>

            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);

                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.description || ""}`}
                      onSelect={() => toggleOption(option.value)}
                      className="cursor-pointer items-start"
                    >
                      <Checkbox checked={isSelected} className="mt-0.5" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{option.label}</div>
                        {option.description ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        ) : null}
                      </div>
                      {isSelected ? (
                        <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
