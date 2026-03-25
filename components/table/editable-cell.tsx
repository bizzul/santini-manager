"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type EditableCellType = "text" | "number" | "checkbox" | "textarea" | "date";

export type EditableCellProps<T = any> = {
  /** The current value of the cell */
  value: string | number | boolean | null | undefined;
  /** The row data from tanstack table */
  row: { original: T };
  /** The field name to update */
  field: string;
  /** The type of input to render */
  type: EditableCellType;
  /** Function to call when saving. Should return { success: true } or { error: string } */
  onSave: (
    rowData: T,
    field: string,
    newValue: string | number | boolean | null
  ) => Promise<{ success?: boolean; error?: string } | void>;
  /** Optional formatter for display value */
  formatter?: (value: any) => string;
  /** Optional suffix to display after value (e.g., "CHF", "%") */
  suffix?: string;
  /** Optional placeholder text when value is empty */
  placeholder?: string;
  /** Optional className for the container */
  className?: string;
  /** Whether the cell is editable (default: true) */
  editable?: boolean;
  /** Enter edit mode with single click instead of double click */
  activateOnSingleClick?: boolean;
  /** Min value for number inputs */
  min?: number;
  /** Max value for number inputs */
  max?: number;
  /** Step value for number inputs */
  step?: number;
};

export function EditableCell<T = any>({
  value,
  row,
  field,
  type,
  onSave,
  formatter,
  suffix,
  placeholder = "-",
  className,
  editable = true,
  activateOnSingleClick = true,
  min,
  max,
  step,
}: EditableCellProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | boolean>("");
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticValue, setOptimisticValue] = useState<
    string | number | boolean | null | undefined
  >(undefined);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Reset optimistic value when prop value changes (server data refreshed)
  useEffect(() => {
    setOptimisticValue(undefined);
  }, [value]);

  const effectiveValue =
    optimisticValue !== undefined ? optimisticValue : value;

  const getDateInputValue = useCallback((inputValue: unknown) => {
    if (!inputValue) return "";

    if (typeof inputValue === "string") {
      const matchedDate = inputValue.match(/^(\d{4}-\d{2}-\d{2})/);
      if (matchedDate) {
        return matchedDate[1];
      }
    }

    const parsedDate = inputValue instanceof Date ? inputValue : new Date(String(inputValue));
    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Format display value
  const getDisplayValue = useCallback(() => {
    if (
      effectiveValue === null ||
      effectiveValue === undefined ||
      effectiveValue === ""
    ) {
      return placeholder;
    }

    if (type === "checkbox") {
      return null; // Checkbox handles its own display
    }

    if (formatter) {
      return formatter(effectiveValue);
    }

    if (type === "number" && typeof effectiveValue === "number") {
      const formatted = effectiveValue.toLocaleString("it-CH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return suffix ? `${formatted} ${suffix}` : formatted;
    }

    return suffix
      ? `${effectiveValue} ${suffix}`
      : String(effectiveValue);
  }, [effectiveValue, type, formatter, suffix, placeholder]);

  // Initialize edit value when entering edit mode
  useEffect(() => {
    if (isEditing && type !== "checkbox") {
      if (effectiveValue === null || effectiveValue === undefined) {
        setEditValue("");
      } else if (type === "date") {
        setEditValue(getDateInputValue(effectiveValue));
      } else {
        setEditValue(String(effectiveValue));
      }
    }
  }, [isEditing, effectiveValue, type, getDateInputValue]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Enter edit mode via click or double click
  const handleActivateEdit = useCallback(() => {
    if (!editable || isLoading) return;
    if (type === "checkbox") return; // Checkbox doesn't need double-click
    setIsEditing(true);
  }, [editable, isLoading, type]);

  // Handle blur (save and exit edit mode)
  const handleBlur = useCallback(async () => {
    if (!isEditing) return;

    const originalValue = value;
    let newValue: string | number | boolean | null;

    // Parse the new value based on type
    if (type === "number") {
      if (editValue === "" || editValue === null) {
        newValue = null;
      } else {
        // Handle both comma and dot as decimal separators
        const normalized = String(editValue).replace(",", ".");
        newValue = parseFloat(normalized);
        if (isNaN(newValue)) {
          newValue = null;
        }
      }
    } else {
      newValue = editValue === "" ? null : String(editValue);
    }

    // Check if value actually changed
    if (newValue === originalValue || (newValue === null && (originalValue === null || originalValue === undefined || originalValue === ""))) {
      setIsEditing(false);
      return;
    }

    setOptimisticValue(newValue);
    setIsLoading(true);
    setIsEditing(false);

    try {
      const result = await onSave(row.original, field, newValue);
      const errorMessage = result?.error || (result as any)?.message;
      if (errorMessage || (result && !result.success && !result.error)) {
        toast({
          variant: "destructive",
          description: errorMessage || "Errore durante il salvataggio",
        });
        setOptimisticValue(undefined);
        setEditValue(originalValue != null ? String(originalValue) : "");
      }
    } catch (error: any) {
      console.error("EditableCell save error:", error);
      toast({
        variant: "destructive",
        description: error?.message || "Errore durante il salvataggio",
      });
      setOptimisticValue(undefined);
      setEditValue(originalValue != null ? String(originalValue) : "");
    } finally {
      setIsLoading(false);
    }
  }, [isEditing, editValue, value, type, row.original, field, onSave, toast]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
        setEditValue(value != null ? String(value) : "");
      } else if (e.key === "Enter" && type !== "textarea") {
        e.preventDefault();
        handleBlur();
      }
    },
    [value, type, handleBlur]
  );

  // Handle checkbox toggle
  const handleCheckboxChange = useCallback(
    async (checked: boolean) => {
      if (!editable || isLoading) return;

      setIsLoading(true);
      try {
        const result = await onSave(row.original, field, checked);
        if (result?.error) {
          toast({
            variant: "destructive",
            description: result.error,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          description: "Errore durante il salvataggio",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [editable, isLoading, row.original, field, onSave, toast]
  );

  // Render checkbox
  if (type === "checkbox") {
    return (
      <div className={cn("flex items-center justify-start", className)}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={handleCheckboxChange}
            disabled={!editable}
          />
        )}
      </div>
    );
  }

  // Render editing state
  if (isEditing) {
    const inputClassName = cn(
      "h-8 min-w-[80px] w-full px-2 py-1 text-sm",
      "border-primary ring-1 ring-primary focus-visible:ring-primary",
      className
    );

    if (type === "textarea") {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(inputClassName, "min-h-[60px] resize-none")}
          rows={2}
        />
      );
    }

    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === "date" ? "date" : "text"}
        inputMode={type === "number" ? "decimal" : type === "date" ? undefined : "text"}
        value={editValue as string}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClassName}
        min={min}
        max={max}
        step={step}
      />
    );
  }

  // Render display state
  const displayValue = getDisplayValue();
  const isEmpty =
    effectiveValue === null ||
    effectiveValue === undefined ||
    effectiveValue === "";

  return (
    <div
      className={cn(
        "group relative min-h-[32px] flex items-center cursor-default",
        editable &&
          "cursor-text rounded px-1 -mx-1 pr-6 transition-colors hover:bg-muted/50",
        isLoading && "opacity-50",
        className
      )}
      onClick={activateOnSingleClick ? handleActivateEdit : undefined}
      onDoubleClick={activateOnSingleClick ? undefined : handleActivateEdit}
      data-editable={editable ? "true" : undefined}
      title={
        editable
          ? activateOnSingleClick
            ? "Clicca per modificare"
            : "Doppio click per modificare"
          : undefined
      }
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-muted-foreground">{displayValue}</span>
        </span>
      ) : (
        <>
          <span className={cn("truncate", isEmpty && "text-muted-foreground")}>
            {displayValue}
          </span>
          {editable && (
            <Pencil className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Helper function to create an onSave handler for a specific table
 */
export function createEditHandler<T extends { id?: string | number; item_id?: string; variant_id?: string }>(
  editAction: (...args: any[]) => Promise<any>,
  options?: {
    domain?: string;
    /** For inventory: whether to use variant_id */
    useVariantId?: boolean;
    /** Custom ID getter */
    getId?: (row: T) => string | number;
  }
) {
  return async (
    rowData: T,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    const formData = { [field]: newValue };
    
    let id: string | number;
    if (options?.getId) {
      id = options.getId(rowData);
    } else if (options?.useVariantId && rowData.variant_id) {
      // For inventory with variant
      const itemId = rowData.item_id || rowData.id;
      const variantId = rowData.variant_id;
      const result = await editAction(formData, itemId, variantId);
      return result || { success: true };
    } else {
      id = rowData.id as string | number;
    }

    const result = await editAction(formData, id, options?.domain);
    return result || { success: true };
  };
}
