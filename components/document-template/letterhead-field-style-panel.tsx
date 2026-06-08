"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LetterheadFieldId } from "@/lib/documenti/letterhead-field-catalog";

interface LetterheadFieldStylePanelProps {
  fieldId: LetterheadFieldId | null;
  fieldLabel: string | null;
  fontSize: number;
  alignment: "left" | "center" | "right";
  onFontSizeChange: (size: number) => void;
  onAlignmentChange: (alignment: "left" | "center" | "right") => void;
}

export function LetterheadFieldStylePanel({
  fieldId,
  fieldLabel,
  fontSize,
  alignment,
  onFontSizeChange,
  onAlignmentChange,
}: LetterheadFieldStylePanelProps) {
  if (!fieldId || !fieldLabel) {
    return (
      <p className="text-xs text-muted-foreground">
        Seleziona un campo dalla lista per modificarne stile e dimensione.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-sm font-medium">{fieldLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="field-font-size">Dimensione font (pt)</Label>
          <Input
            id="field-font-size"
            type="number"
            min={6}
            max={24}
            step={0.5}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value) || 10)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Allineamento</Label>
          <Select
            value={alignment}
            onValueChange={(v) =>
              onAlignmentChange(v as "left" | "center" | "right")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Sinistra</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Destra</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
