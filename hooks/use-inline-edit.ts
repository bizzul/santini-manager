"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type SaveFunction<T> = (
  rowData: T,
  field: string,
  newValue: string | number | boolean | null
) => Promise<{ success?: boolean; error?: string } | void>;

type UseInlineEditOptions<T> = {
  onSave: SaveFunction<T>;
  rowData: T;
  field: string;
  initialValue?: string | number | boolean | null;
};

type UseInlineEditReturn = {
  isEditing: boolean;
  isLoading: boolean;
  value: string | number | boolean | null;
  startEditing: () => void;
  cancelEditing: () => void;
  setValue: (value: string | number | boolean | null) => void;
  saveValue: () => Promise<void>;
};

/**
 * Hook for managing inline edit state
 * Can be used for custom editable cell implementations
 */
export function useInlineEdit<T>({
  onSave,
  rowData,
  field,
  initialValue = null,
}: UseInlineEditOptions<T>): UseInlineEditReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [value, setValue] = useState<string | number | boolean | null>(initialValue);
  const [originalValue, setOriginalValue] = useState<string | number | boolean | null>(initialValue);
  const { toast } = useToast();

  const startEditing = useCallback(() => {
    setOriginalValue(value);
    setIsEditing(true);
  }, [value]);

  const cancelEditing = useCallback(() => {
    setValue(originalValue);
    setIsEditing(false);
  }, [originalValue]);

  const saveValue = useCallback(async () => {
    if (value === originalValue) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setIsEditing(false);

    try {
      const result = await onSave(rowData, field, value);
      if (result?.error) {
        toast({
          variant: "destructive",
          description: result.error,
        });
        setValue(originalValue);
      } else {
        setOriginalValue(value);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore durante il salvataggio",
      });
      setValue(originalValue);
    } finally {
      setIsLoading(false);
    }
  }, [value, originalValue, onSave, rowData, field, toast]);

  return {
    isEditing,
    isLoading,
    value,
    startEditing,
    cancelEditing,
    setValue,
    saveValue,
  };
}

/**
 * Generic edit action creator for tables
 * Creates a save function compatible with EditableCell and useInlineEdit
 */
export function createTableEditHandler<
  T extends Record<string, any>,
  ActionFn extends (...args: any[]) => Promise<any>
>(
  editAction: ActionFn,
  options: {
    /** Domain parameter for site-scoped actions */
    domain?: string;
    /** Custom function to get the ID from row data */
    getIds?: (row: T) => { id: string | number; variantId?: string };
    /** Field name for the primary ID (default: "id") */
    idField?: string;
    /** Field name for secondary ID (e.g., variant_id for inventory) */
    secondaryIdField?: string;
  } = {}
) {
  const { domain, getIds, idField = "id", secondaryIdField } = options;

  return async (
    rowData: T,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    const formData = { [field]: newValue };

    try {
      let result;

      if (getIds) {
        const { id, variantId } = getIds(rowData);
        if (variantId) {
          result = await editAction(formData, id, variantId);
        } else {
          result = await editAction(formData, id, domain);
        }
      } else if (secondaryIdField && rowData[secondaryIdField]) {
        // For tables with two IDs (like inventory with item_id and variant_id)
        const primaryId = rowData[idField];
        const secondaryId = rowData[secondaryIdField];
        result = await editAction(formData, primaryId, secondaryId);
      } else {
        // Standard single ID case
        const id = rowData[idField];
        result = await editAction(formData, id, domain);
      }

      // Normalize result
      if (!result) {
        return { success: true };
      }
      if (result.error || result.message) {
        return { error: result.error || result.message };
      }
      return { success: true };
    } catch (error: any) {
      console.error("Inline edit error:", error);
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
}
