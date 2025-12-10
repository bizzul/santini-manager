"use client";

import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KANBAN_ICONS,
  getKanbanIcon,
  getKanbanIconOption,
} from "@/lib/kanban-icons";

interface IconSelectorProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function IconSelector({
  value,
  onChange,
  placeholder = "Seleziona icona...",
  className,
  disabled = false,
}: IconSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedIcon = useMemo(() => {
    return getKanbanIconOption(value);
  }, [value]);

  const SelectedIconComponent = useMemo(() => {
    return getKanbanIcon(value);
  }, [value]);

  const filteredIcons = useMemo(() => {
    if (!searchQuery) return KANBAN_ICONS;
    const query = searchQuery.toLowerCase();
    return KANBAN_ICONS.filter(
      (icon) =>
        icon.label.toLowerCase().includes(query) ||
        icon.value.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {selectedIcon ? (
            <div className="flex items-center gap-2">
              <SelectedIconComponent className="h-4 w-4" />
              <span>{selectedIcon.label}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca icona..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nessuna icona trovata.</CommandEmpty>
            <CommandGroup>
              {filteredIcons.map((iconOption) => {
                const IconComponent = iconOption.icon;
                return (
                  <CommandItem
                    key={iconOption.value}
                    value={iconOption.value}
                    onSelect={() => {
                      onChange(iconOption.value);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === iconOption.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <IconComponent className="mr-2 h-4 w-4" />
                    <span>{iconOption.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Icon selector with color preview for categories
 */
interface IconSelectorWithColorProps extends IconSelectorProps {
  color?: string;
}

export function IconSelectorWithColor({
  value,
  onChange,
  color = "#3B82F6",
  placeholder = "Seleziona icona...",
  className,
  disabled = false,
}: IconSelectorWithColorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedIcon = useMemo(() => {
    return getKanbanIconOption(value);
  }, [value]);

  const SelectedIconComponent = useMemo(() => {
    return getKanbanIcon(value);
  }, [value]);

  const filteredIcons = useMemo(() => {
    if (!searchQuery) return KANBAN_ICONS;
    const query = searchQuery.toLowerCase();
    return KANBAN_ICONS.filter(
      (icon) =>
        icon.label.toLowerCase().includes(query) ||
        icon.value.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {selectedIcon ? (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: color }}
              >
                <SelectedIconComponent className="h-4 w-4 text-white" />
              </div>
              <span>{selectedIcon.label}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca icona..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nessuna icona trovata.</CommandEmpty>
            <CommandGroup>
              {filteredIcons.map((iconOption) => {
                const IconComponent = iconOption.icon;
                return (
                  <CommandItem
                    key={iconOption.value}
                    value={iconOption.value}
                    onSelect={() => {
                      onChange(iconOption.value);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === iconOption.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div
                      className="mr-2 w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <span>{iconOption.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
