"use client";

import React from "react";
import { STATUS_CONFIG, AttendanceStatus } from "./attendance-types";
import { useT } from "@/components/i18n/i18n-provider";

export function AttendanceLegend() {
    const t = useT();
    const statuses = Object.entries(STATUS_CONFIG) as [AttendanceStatus | "weekend", typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][];

    return (
        <div className="flex flex-wrap gap-3">
            {statuses.map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${config.bgClass}`} />
                    <span className="text-xs text-muted-foreground">
                        {t(`attendance.status.${key}`)}
                    </span>
                </div>
            ))}
        </div>
    );
}
