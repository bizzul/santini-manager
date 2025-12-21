"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X, FileText } from "lucide-react";
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

interface Offer {
  id: number;
  unique_code: string;
  name?: string;
  clientName?: string;
  label: string;
}

interface OfferSelectProps {
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  siteId?: string;
}

export function OfferSelect({
  value,
  onValueChange,
  placeholder = "Cerca offerta da collegare...",
  disabled = false,
  emptyMessage = "Nessuna offerta trovata.",
}: OfferSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedOffer, setSelectedOffer] = React.useState<Offer | null>(null);

  // Fetch offers when search changes or popover opens
  const fetchOffers = React.useCallback(async (searchTerm: string = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      params.set("excludeLinked", "true");

      const response = await fetch(`/api/tasks/offers?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOffers(data.offers || []);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open
  React.useEffect(() => {
    if (open) {
      fetchOffers(search);
    }
  }, [open, fetchOffers]);

  // Debounced search
  React.useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchOffers(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open, fetchOffers]);

  // Load selected offer details if value is set but selectedOffer is not
  React.useEffect(() => {
    if (value && !selectedOffer) {
      // Try to find in current offers list
      const found = offers.find((o) => o.id === value);
      if (found) {
        setSelectedOffer(found);
      }
    }
    if (!value) {
      setSelectedOffer(null);
    }
  }, [value, offers, selectedOffer]);

  const handleSelect = (offer: Offer) => {
    setSelectedOffer(offer);
    onValueChange?.(offer.id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOffer(null);
    onValueChange?.(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedOffer ? (
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedOffer.label}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {selectedOffer && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca per codice o cliente..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : offers.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {offers.map((offer) => (
                  <CommandItem
                    key={offer.id}
                    value={offer.label}
                    onSelect={() => handleSelect(offer)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === offer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">
                          {offer.unique_code}
                        </Badge>
                        {offer.clientName && (
                          <span className="truncate text-sm">
                            {offer.clientName}
                          </span>
                        )}
                      </div>
                      {offer.name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {offer.name}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

