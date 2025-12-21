"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, Package } from "lucide-react";
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
import { SellProduct } from "@/types/supabase";

interface ProductMultiSelectProps {
  products: SellProduct[];
  value?: number[];
  onValueChange?: (value: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

export function ProductMultiSelect({
  products = [],
  value = [],
  onValueChange,
  placeholder = "Seleziona prodotti...",
  disabled = false,
  emptyMessage = "Nessun prodotto trovato.",
}: ProductMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];

  const selectedProducts = React.useMemo(
    () => safeProducts.filter((p) => value.includes(p.id)),
    [safeProducts, value]
  );

  const filteredProducts = React.useMemo(() => {
    if (!search) return safeProducts;
    const searchLower = search.toLowerCase();
    return safeProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.type?.toLowerCase().includes(searchLower) ||
        p.category?.name?.toLowerCase().includes(searchLower)
    );
  }, [safeProducts, search]);

  const handleToggle = (productId: number) => {
    const newValue = value.includes(productId)
      ? value.filter((id) => id !== productId)
      : [...value, productId];
    onValueChange?.(newValue);
  };

  const handleRemove = (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.(value.filter((id) => id !== productId));
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
            {selectedProducts.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedProducts.length <= 2 ? (
              selectedProducts.map((product) => (
                <Badge
                  key={product.id}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {product.name}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemove(product.id, e)}
                  />
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">
                {selectedProducts.length} prodotti selezionati
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
            placeholder="Cerca prodotto..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredProducts.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredProducts.map((product) => {
                  const isSelected = value.includes(product.id);
                  return (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.type}`}
                      onSelect={() => handleToggle(product.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium truncate">
                            {product.name}
                          </span>
                        </div>
                        {product.type && (
                          <span className="text-xs text-muted-foreground truncate">
                            {product.type}
                            {product.category?.name &&
                              ` • ${product.category.name}`}
                          </span>
                        )}
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
        {selectedProducts.length > 0 && (
          <div className="border-t p-2">
            <div className="text-xs text-muted-foreground mb-2">
              Selezionati ({selectedProducts.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedProducts.map((product) => (
                <Badge key={product.id} variant="outline" className="text-xs">
                  {product.name}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemove(product.id, e)}
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
