"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AttendanceDayCell } from "./AttendanceDayCell";
import {
    AttendanceStatus,
    AttendanceEntry,
    AttendanceUser,
} from "./attendance-types";

interface AttendanceMonthlyViewProps {
    year: number;
    month: number;
    users: AttendanceUser[];
    attendance: Record<string, Record<string, AttendanceEntry>>;
    isAdmin: boolean;
    onStatusChange?: (userId: string, date: string, status: AttendanceStatus) => void;
}

export function AttendanceMonthlyView({
    year,
    month,
    users,
    attendance,
    isAdmin,
    onStatusChange,
}: AttendanceMonthlyViewProps) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const days = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isSunday = dayOfWeek === 0;
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return { day, date, isWeekend, isSunday, dateStr, isToday: dateStr === todayStr };
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[180px]">
                            Dipendente
                        </th>
                        {days.map(({ day, isWeekend, date }) => (
                            <th
                                key={day}
                                className={`px-0.5 py-2 text-center text-xs font-medium ${
                                    isWeekend ? "text-muted-foreground/50" : "text-muted-foreground"
                                }`}
                            >
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[10px]">
                                        {date.toLocaleDateString("it-IT", { weekday: "narrow" })}
                                    </span>
                                    <span>{day}</span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const userAttendance = attendance[user.id] || {};
                        const initials = user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);

                        return (
                            <tr key={user.id} className="border-t border-border/50 hover:bg-muted/30">
                                <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={user.picture || undefined} />
                                            <AvatarFallback className="text-[10px]">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium truncate max-w-[140px]">
                                            {user.name}
                                        </span>
                                    </div>
                                </td>
                                {days.map(({ day, date, isWeekend, isSunday, dateStr, isToday }) => (
                                    <td key={day} className="px-0.5 py-1.5 text-center">
                                        <div className="flex justify-center">
                                            <AttendanceDayCell
                                                date={date}
                                                entry={userAttendance[dateStr]}
                                                isWeekend={isWeekend}
                                                isSunday={isSunday}
                                                isToday={isToday}
                                                isAdmin={isAdmin}
                                                size="md"
                                                onStatusChange={(status) =>
                                                    onStatusChange?.(user.id, dateStr, status)
                                                }
                                            />
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
