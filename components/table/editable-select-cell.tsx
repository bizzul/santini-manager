"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";

export type SelectOption = {
  value: string | number;
  label: string;
};

export type EditableSelectCellProps<T = any> = {
  value: string | number | null | undefined;
  displayValue?: string;
  row: { original: T };
  field: string;
  options?: SelectOption[];
  getOptions?: (rowData: T) => SelectOption[] | Promise<SelectOption[]>;
  onSave: (
    rowData: T,
    field: string,
    newValue: string | number | boolean | Date | null
  ) => Promise<{ success?: boolean; error?: string } | void>;
  placeholder?: string;
  className?: string;
  emptyMessage?: string;
};

export function EditableSelectCell<T = any>({
  value,
  displayValue,
  row,
  field,
  options: staticOptions,
  getOptions,
  onSave,
  placeholder = "-",
  className,
  emptyMessage = "Nessun risultato.",
}: EditableSelectCellProps<T>) {
  const [open, setOpen] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<SelectOption[] | null>(
    null
  );
  // Optimistic state: shows the newly selected label immediately after save
  const [optimisticLabel, setOptimisticLabel] = useState<string | null>(null);
  const { toast } = useToast();

  const options = dynamicOptions ?? staticOptions ?? [];

  // Reset optimistic label when the prop value changes (server data refreshed)
  useEffect(() => {
    setOptimisticLabel(null);
  }, [value]);

  const baseLabel =
    displayValue ||
    options.find(
      (o) =>
        o.value === value || o.value?.toString() === value?.toString()
    )?.label ||
    placeholder;

  const currentLabel = optimisticLabel ?? baseLabel;

  useEffect(() => {
    if (open && getOptions) {
      setIsLoadingOptions(true);
      const result = getOptions(row.original);
      if (result instanceof Promise) {
        result
          .then((opts) => {
            setDynamicOptions(opts);
            setIsLoadingOptions(false);
          })
          .catch(() => {
            setIsLoadingOptions(false);
          });
      } else {
        setDynamicOptions(result);
        setIsLoadingOptions(false);
      }
    }
  }, [open, getOptions, row.original]);

  const handleSelect = useCallback(
    async (newValue: string | number) => {
      if (newValue === value || newValue?.toString() === value?.toString()) {
        setOpen(false);
        return;
      }

      // Optimistically show the selected label
      const selectedOption = options.find(
        (o) =>
          o.value === newValue ||
          o.value?.toString() === newValue?.toString()
      );
      if (selectedOption) {
        setOptimisticLabel(selectedOption.label);
      }

      setOpen(false);
      setIsSaving(true);
      try {
        const result = await onSave(row.original, field, newValue);
        const errorMessage = result?.error || (result as any)?.message;
        if (errorMessage) {
          setOptimisticLabel(null); // Revert on error
          toast({
            variant: "destructive",
            description: errorMessage,
          });
        }
      } catch (error: any) {
        setOptimisticLabel(null); // Revert on error
        toast({
          variant: "destructive",
          description: error?.message || "Errore durante il salvataggio",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [value, options, row.original, field, onSave, toast]
  );

  const isEmpty = value === null || value === undefined;
  const showEmpty = isEmpty && !optimisticLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "min-h-[32px] flex items-center cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
            isSaving && "opacity-50",
            className
          )}
          data-editable="true"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-muted-foreground truncate">
                {currentLabel}
              </span>
            </span>
          ) : (
            <span
              className={cn(
                "truncate",
                showEmpty && "text-muted-foreground"
              )}
            >
              {currentLabel}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0"
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Cerca..." />
          <CommandList>
            {isLoadingOptions ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => handleSelect(option.value)}
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
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
