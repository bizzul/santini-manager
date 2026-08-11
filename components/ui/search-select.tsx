"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { categoryIconName } from "@/lib/category-diagram-icons";
import { getKanbanIcon } from "@/lib/kanban-icons";

export type SearchSelectOption = {
  value: string | number;
  label: string;
  icon?: string | null;
  iconColor?: string | null;
};

interface SearchSelectProps {
  value?: string | number | null;
  onValueChange?: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  options: SearchSelectOption[];
  emptyMessage?: string;
}

function OptionIcon({
  label,
  icon,
  iconColor,
}: {
  label: string;
  icon?: string | null;
  iconColor?: string | null;
}) {
  if (!icon && !iconColor) return null;

  const Icon = getKanbanIcon(categoryIconName(label, icon));
  const color = iconColor || "#3B82F6";

  return (
    <span
      className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded"
      style={{ backgroundColor: color }}
    >
      <Icon className="h-3 w-3 text-white" />
    </span>
  );
}

export function SearchSelect({
  value,
  onValueChange,
  placeholder = "Seleziona...",
  disabled = false,
  options,
  emptyMessage = "Nessun risultato trovato.",
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find(
    (option) =>
      option.value === value || option.value.toString() === value?.toString()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-w-0"
          disabled={disabled}
        >
          <span className="flex min-w-0 flex-1 items-center truncate text-left">
            {selectedOption ? (
              <>
                <OptionIcon
                  label={selectedOption.label}
                  icon={selectedOption.icon}
                  iconColor={selectedOption.iconColor}
                />
                <span className="truncate">{selectedOption.label}</span>
              </>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange?.(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ||
                        value?.toString() === option.value.toString()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <OptionIcon
                    label={option.label}
                    icon={option.icon}
                    iconColor={option.iconColor}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
