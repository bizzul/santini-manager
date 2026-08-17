"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

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
  allowCustom?: boolean;
  customLabel?: string | null;
  onCustomSelect?: (label: string) => void;
  searchPlaceholder?: string;
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
  allowCustom = false,
  customLabel = null,
  onCustomSelect,
  searchPlaceholder,
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOption = options.find(
    (option) =>
      option.value === value || option.value.toString() === value?.toString()
  );
  const trimmedSearch = search.trim();
  const searchNeedle = trimmedSearch.toLowerCase();
  const visibleOptions =
    allowCustom && searchNeedle
      ? options.filter((option) =>
          `${option.label} ${option.value}`.toLowerCase().includes(searchNeedle),
        )
      : options;
  const exactMatch = options.some(
    (option) => option.label.toLowerCase() === searchNeedle
  );
  const showCustom = allowCustom && trimmedSearch.length > 0 && !exactMatch;
  const displayLabel = selectedOption?.label || customLabel || null;

  const applyCustom = () => {
    if (!trimmedSearch) return;
    onCustomSelect?.(trimmedSearch.slice(0, 500));
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
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
            ) : displayLabel ? (
              <span className="truncate">{displayLabel}</span>
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
        <Command shouldFilter={!allowCustom}>
          <CommandInput
            {...(allowCustom
              ? {
                  value: search,
                  onValueChange: setSearch,
                  placeholder:
                    searchPlaceholder ?? "Cerca o scrivi un testo libero...",
                  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                    if (
                      event.key === "Enter" &&
                      showCustom &&
                      visibleOptions.length === 0
                    ) {
                      event.preventDefault();
                      applyCustom();
                    }
                  },
                }
              : searchPlaceholder
                ? { placeholder: searchPlaceholder }
                : {})}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom && trimmedSearch ? (
                <button
                  type="button"
                  className="w-full px-2 py-1 text-left text-sm"
                  onClick={applyCustom}
                >
                  Usa testo libero: {trimmedSearch}
                </button>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {visibleOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange?.(option.value);
                    setOpen(false);
                    setSearch("");
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
              {showCustom ? (
                <CommandItem
                  value={`usa testo libero ${trimmedSearch}`}
                  onSelect={applyCustom}
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    Usa testo libero: {trimmedSearch}
                  </span>
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
