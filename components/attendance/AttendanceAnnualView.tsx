"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AttendanceDayCell } from "./AttendanceDayCell";
import {
    AttendanceStatus,
    AttendanceEntry,
    AttendanceUser,
} from "./attendance-types";

interface AttendanceAnnualViewProps {
    year: number;
    users: AttendanceUser[];
    attendance: Record<string, Record<string, AttendanceEntry>>;
    isAdmin: boolean;
    onStatusChange?: (userId: string, date: string, status: AttendanceStatus) => void;
}

const MONTH_NAMES = [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

export function AttendanceAnnualView({
    year,
    users,
    attendance,
    isAdmin,
    onStatusChange,
}: AttendanceAnnualViewProps) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const months = Array.from({ length: 12 }, (_, m) => {
        const month = m + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, d) => {
            const day = d + 1;
            const date = new Date(year, m, day);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isSunday = dayOfWeek === 0;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return { day, date, isWeekend, isSunday, dateStr, isToday: dateStr === todayStr };
        });
        return { month, name: MONTH_NAMES[m], days };
    });

    return (
        <div className="space-y-6">
            {users.map((user) => {
                const userAttendance = attendance[user.id] || {};
                const initials = user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                return (
                    <div key={user.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={user.picture || undefined} />
                                <AvatarFallback className="text-[10px]">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{user.name}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <div className="grid grid-cols-12 gap-2 min-w-[900px]">
                                {months.map(({ month, name, days }) => (
                                    <div key={month} className="space-y-1">
                                        <p className="text-[10px] font-medium text-muted-foreground text-center">
                                            {name}
                                        </p>
                                        <div className="flex flex-wrap gap-[2px]">
                                            {days.map(({ day, date, isWeekend, isSunday, dateStr, isToday }) => (
                                                <AttendanceDayCell
                                                    key={day}
                                                    date={date}
                                                    entry={userAttendance[dateStr]}
                                                    isWeekend={isWeekend}
                                                    isSunday={isSunday}
                                                    isToday={isToday}
                                                    isAdmin={isAdmin}
                                                    size="sm"
                                                    onStatusChange={(status) =>
                                                        onStatusChange?.(user.id, dateStr, status)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
