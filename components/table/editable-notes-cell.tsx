"use client";

import { useState, useCallback } from "react";
import { StickyNote, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export type EditableNotesCellProps<T = any> = {
  value: string | null | undefined;
  row: { original: T };
  field: string;
  onSave: (
    rowData: T,
    field: string,
    newValue: string | number | boolean | Date | null
  ) => Promise<{ success?: boolean; error?: string } | void>;
  className?: string;
};

export function EditableNotesCell<T = any>({
  value,
  row,
  field,
  onSave,
  className,
}: EditableNotesCellProps<T>) {
  const [open, setOpen] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const hasNotes = !!value && value.trim() !== "";

  const handleSave = useCallback(async () => {
    const newValue = editValue.trim() || null;
    const originalValue = value?.trim() || null;

    if (newValue === originalValue) return;

    setIsSaving(true);
    try {
      const result = await onSave(row.original, field, newValue);
      const errorMessage = result?.error || (result as any)?.message;
      if (errorMessage) {
        toast({
          variant: "destructive",
          description: errorMessage,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error?.message || "Errore durante il salvataggio",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, row.original, field, onSave, toast]);

  const handleOpenChange = useCallback(
    async (isOpen: boolean) => {
      if (isOpen) {
        setEditValue(value || "");
      } else {
        await handleSave();
      }
      setOpen(isOpen);
    },
    [value, handleSave]
  );

  return (
    <div
      className={cn(
        "flex items-center justify-center w-full h-full",
        className
      )}
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <div
            className="group relative flex h-8 min-w-[32px] items-center justify-center rounded px-1 transition-colors hover:bg-muted/50"
            data-editable="true"
            title={hasNotes ? value! : "Clicca per aggiungere nota"}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasNotes ? (
              <StickyNote className="h-4 w-4 text-primary" />
            ) : (
              <div className="h-6 w-6 rounded border border-muted-foreground/20 transition-colors group-hover:border-muted-foreground/40" />
            )}
            {!isSaving && (
              <Pencil className="pointer-events-none absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="center">
          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Aggiungi nota..."
              rows={4}
              className="resize-none"
              autoFocus
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
