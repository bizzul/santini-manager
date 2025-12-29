"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, Folder } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SellProductCategory } from "@/types/supabase";

interface CategoryMultiSelectProps {
  categories: SellProductCategory[];
  value?: number[];
  onValueChange?: (value: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

export function CategoryMultiSelect({
  categories = [],
  value = [],
  onValueChange,
  placeholder = "Seleziona categorie...",
  disabled = false,
  emptyMessage = "Nessuna categoria trovata.",
}: CategoryMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  const selectedCategories = React.useMemo(
    () => safeCategories.filter((c) => value.includes(c.id)),
    [safeCategories, value]
  );

  const filteredCategories = React.useMemo(() => {
    if (!search) return safeCategories;
    const searchLower = search.toLowerCase();
    return safeCategories.filter(
      (c) =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
    );
  }, [safeCategories, search]);

  const handleToggle = (categoryId: number) => {
    const newValue = value.includes(categoryId)
      ? value.filter((id) => id !== categoryId)
      : [...value, categoryId];
    onValueChange?.(newValue);
  };

  const handleRemove = (categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.(value.filter((id) => id !== categoryId));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-[40px] h-auto"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedCategories.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedCategories.length <= 3 ? (
              selectedCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="mr-1 mb-1"
                  style={{
                    backgroundColor: category.color
                      ? `${category.color}20`
                      : undefined,
                    borderColor: category.color || undefined,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: category.color || "#3B82F6" }}
                  />
                  {category.name}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemove(category.id, e)}
                  />
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">
                {selectedCategories.length} categorie selezionate
                <X
                  className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={handleClearAll}
                />
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca categoria..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredCategories.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredCategories.map((category) => {
                  const isSelected = value.includes(category.id);
                  return (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => handleToggle(category.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: category.color || "#3B82F6",
                          }}
                        >
                          <Folder className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium truncate">
                            {category.name}
                          </span>
                          {category.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {category.description}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        {selectedCategories.length > 0 && (
          <div className="border-t p-2">
            <div className="text-xs text-muted-foreground mb-2">
              Selezionate ({selectedCategories.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: category.color || undefined,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: category.color || "#3B82F6" }}
                  />
                  {category.name}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemove(category.id, e)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

