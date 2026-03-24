"use client";

import React from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
    AttendanceStatus,
    AttendanceEntry,
    STATUS_CONFIG,
} from "./attendance-types";

interface AttendanceDayCellProps {
    date: Date;
    entry?: AttendanceEntry;
    isWeekend: boolean;
    isSunday: boolean;
    isToday: boolean;
    isAdmin: boolean;
    size?: "sm" | "md";
    onStatusChange?: (status: AttendanceStatus) => void;
}

export function AttendanceDayCell({
    date,
    entry,
    isWeekend,
    isSunday,
    isToday,
    isAdmin,
    size = "md",
    onStatusChange,
}: AttendanceDayCellProps) {
    const [open, setOpen] = React.useState(false);

    const statusKey = isWeekend ? "weekend" : entry?.status;
    const config = statusKey ? STATUS_CONFIG[statusKey] : null;
    const displayLabel = isSunday
        ? "Festivo"
        : entry
        ? STATUS_CONFIG[entry.status].label
        : null;

    const sizeClasses = size === "sm" ? "w-3 h-3" : "w-6 h-6";
    const tooltipText = isSunday
        ? `${format(date, "EEEE d MMMM", { locale: it })}\nFestivo`
        : isWeekend
        ? format(date, "EEEE d MMMM", { locale: it })
        : entry
        ? `${format(date, "EEEE d MMMM", { locale: it })}\n${displayLabel}${entry.notes ? `\n${entry.notes}` : ""}${entry.autoDetected ? " (auto)" : ""}`
        : format(date, "EEEE d MMMM", { locale: it });

    const cellContent = (
        <div
            className={cn(
                sizeClasses,
                "rounded-sm transition-all cursor-default",
                config?.bgClass || "bg-gray-100 dark:bg-gray-800",
                isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                !isWeekend && isAdmin && "cursor-pointer hover:opacity-80",
                !isWeekend && !entry && !isAdmin && "bg-gray-100 dark:bg-gray-800"
            )}
        />
    );

    if (isAdmin && !isWeekend) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>{cellContent}</PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="whitespace-pre-line text-xs">{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-auto p-2" align="start">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            {format(date, "d MMMM yyyy", { locale: it })}
                        </p>
                        {(Object.keys(STATUS_CONFIG) as (AttendanceStatus | "weekend")[])
                            .filter((s) => s !== "weekend")
                            .map((status) => (
                                <Button
                                    key={status}
                                    variant={entry?.status === status ? "default" : "ghost"}
                                    size="sm"
                                    className="w-full justify-start gap-2 h-7 text-xs"
                                    onClick={() => {
                                        onStatusChange?.(status as AttendanceStatus);
                                        setOpen(false);
                                    }}
                                >
                                    <div
                                        className={cn(
                                            "w-3 h-3 rounded-sm",
                                            STATUS_CONFIG[status as AttendanceStatus].bgClass
                                        )}
                                    />
                                    {STATUS_CONFIG[status as AttendanceStatus].label}
                                </Button>
                            ))}
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
            <TooltipContent>
                <p className="whitespace-pre-line text-xs">{tooltipText}</p>
            </TooltipContent>
        </Tooltip>
    );
}
