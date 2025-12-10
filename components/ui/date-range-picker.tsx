"use client";

import * as React from "react";
import { format } from "date-fns";
import { it as dateFnsIt } from "date-fns/locale";
import { it } from "react-day-picker/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DateRangePickerValue {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePreset {
  key: string;
  label: string;
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRangePickerValue;
  onValueChange: (value: DateRangePickerValue) => void;
  presets?: DateRangePreset[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onValueChange,
  presets,
  placeholder = "Seleziona periodo",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("");

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = presets?.find((p) => p.key === presetKey);
    if (preset) {
      onValueChange({ from: preset.from, to: preset.to });
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedPreset("");
    onValueChange({
      from: range?.from,
      to: range?.to,
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {presets && presets.length > 0 && (
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Periodi predefiniti" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.key} value={preset.key}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value.from && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd/MM/yyyy", { locale: dateFnsIt })} -{" "}
                  {format(value.to, "dd/MM/yyyy", { locale: dateFnsIt })}
                </>
              ) : (
                format(value.from, "dd/MM/yyyy", { locale: dateFnsIt })
              )
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={it}
            weekStartsOn={1}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
