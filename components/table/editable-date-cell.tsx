"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

export type EditableDateCellProps<T = any> = {
  value: string | Date | null | undefined;
  row: { original: T };
  field: string;
  onSave: (
    rowData: T,
    field: string,
    newValue: string | number | boolean | Date | null
  ) => Promise<{ success?: boolean; error?: string } | void>;
  placeholder?: string;
  className?: string;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function EditableDateCell<T = any>({
  value,
  row,
  field,
  onSave,
  placeholder = "-",
  className,
}: EditableDateCellProps<T>) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticDate, setOptimisticDate] = useState<Date | null>(null);
  const { toast } = useToast();

  const currentDate = value
    ? value instanceof Date
      ? value
      : new Date(value)
    : null;
  const isValidDate = currentDate && !isNaN(currentDate.getTime());

  // Reset optimistic state when prop value changes
  useEffect(() => {
    setOptimisticDate(null);
  }, [value]);

  const displayDate = optimisticDate ?? (isValidDate ? currentDate : null);
  const formattedDate = displayDate ? formatDate(displayDate) : null;

  const handleSelect = useCallback(
    async (date: Date | undefined) => {
      if (!date) return;

      setOptimisticDate(date);
      setOpen(false);
      setIsSaving(true);

      try {
        const result = await onSave(row.original, field, date);
        const errorMessage = result?.error || (result as any)?.message;
        if (errorMessage) {
          setOptimisticDate(null);
          toast({
            variant: "destructive",
            description: errorMessage,
          });
        }
      } catch (error: any) {
        setOptimisticDate(null);
        toast({
          variant: "destructive",
          description: error?.message || "Errore durante il salvataggio",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [row.original, field, onSave, toast]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          suppressHydrationWarning
          className={cn(
            "min-h-[32px] flex items-center cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors whitespace-nowrap",
            isSaving && "opacity-50",
            className
          )}
          data-editable="true"
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span
              suppressHydrationWarning
              className={cn(!formattedDate && "text-muted-foreground")}
            >
              {formattedDate || placeholder}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={displayDate ?? undefined}
          onSelect={handleSelect}
          captionLayout="dropdown"
          startMonth={new Date(new Date().getFullYear() - 1, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}
