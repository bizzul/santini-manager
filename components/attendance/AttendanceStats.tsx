"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    AttendanceEntry,
    AttendanceUser,
    STATUS_CONFIG,
    AttendanceStatus,
} from "./attendance-types";

interface AttendanceStatsProps {
    users: AttendanceUser[];
    attendance: Record<string, Record<string, AttendanceEntry>>;
}

export function AttendanceStats({ users, attendance }: AttendanceStatsProps) {
    const statusCounts: Record<string, number> = {};
    const statusTypes = Object.keys(STATUS_CONFIG).filter((s) => s !== "weekend") as AttendanceStatus[];

    statusTypes.forEach((s) => {
        statusCounts[s] = 0;
    });

    Object.values(attendance).forEach((userEntries) => {
        Object.values(userEntries).forEach((entry) => {
            if (statusCounts[entry.status] !== undefined) {
                statusCounts[entry.status]++;
            }
        });
    });

    const totalEntries = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {statusTypes.map((status) => {
                const config = STATUS_CONFIG[status];
                const count = statusCounts[status] || 0;
                const percentage = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0;

                return (
                    <Card key={status} className="overflow-hidden">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3 h-3 rounded-sm ${config.bgClass}`} />
                                <span className="text-xs font-medium truncate">{config.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold">{count}</span>
                                <span className="text-xs text-muted-foreground">
                                    ({percentage}%)
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
