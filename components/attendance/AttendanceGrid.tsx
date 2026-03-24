"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, Rows3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AttendanceMonthlyView } from "./AttendanceMonthlyView";
import { AttendanceAnnualView } from "./AttendanceAnnualView";
import { AttendanceStats } from "./AttendanceStats";
import { AttendanceLegend } from "./AttendanceLegend";
import { LeaveRequestsPanel } from "./LeaveRequestsPanel";
import {
    AttendanceStatus,
    AttendanceEntry,
    AttendanceUser,
    LeaveRequest,
} from "./attendance-types";
import { WeeklyCalendarView } from "@/components/calendar/WeeklyCalendarView";
import {
    buildAttendanceCalendarItems,
    buildTimetrackingCalendarItems,
} from "@/components/calendar/calendar-utils";

interface AttendanceGridProps {
    domain: string;
    isAdmin: boolean;
    currentUserId?: string;
}

const MONTH_NAMES = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

async function fetchAttendance(domain: string, year: number, month: number | null) {
    const params = new URLSearchParams({ year: year.toString() });
    if (month !== null) params.set("month", month.toString());

    const response = await fetch(`/api/sites/${domain}/attendance?${params}`);
    if (!response.ok) throw new Error("Failed to fetch attendance");
    return response.json();
}

async function fetchLeaveRequests(domain: string) {
    const response = await fetch(`/api/sites/${domain}/leave-requests`);
    if (!response.ok) throw new Error("Failed to fetch leave requests");
    return response.json();
}

export function AttendanceGrid({ domain, isAdmin, currentUserId }: AttendanceGridProps) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [view, setView] = useState<"weekly" | "monthly" | "annual">("weekly");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const queryMonth = view === "annual" ? null : month;

    const { data: attendanceData, isLoading: loadingAttendance } = useQuery({
        queryKey: ["attendance", domain, year, queryMonth],
        queryFn: () => fetchAttendance(domain, year, queryMonth),
        staleTime: 2 * 60 * 1000,
    });

    const { data: leaveData, isLoading: loadingLeaves } = useQuery({
        queryKey: ["leave-requests", domain],
        queryFn: () => fetchLeaveRequests(domain),
        staleTime: 2 * 60 * 1000,
    });

    const updateAttendance = useMutation({
        mutationFn: async ({
            userId,
            date,
            status,
        }: {
            userId: string;
            date: string;
            status: AttendanceStatus;
        }) => {
            const response = await fetch(`/api/sites/${domain}/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, date, status }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Errore");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance", domain] });
        },
        onError: (error: Error) => {
            toast({
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const reviewLeave = useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: "approved" | "rejected";
        }) => {
            const response = await fetch(
                `/api/sites/${domain}/leave-requests/${id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                }
            );
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Errore");
            }
            return response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["leave-requests", domain] });
            queryClient.invalidateQueries({ queryKey: ["attendance", domain] });
            toast({
                description: variables.status === "approved"
                    ? "Richiesta approvata"
                    : "Richiesta rifiutata",
            });
        },
        onError: (error: Error) => {
            toast({
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleStatusChange = useCallback(
        (userId: string, date: string, status: AttendanceStatus) => {
            updateAttendance.mutate({ userId, date, status });
        },
        [updateAttendance]
    );

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    const users: AttendanceUser[] = attendanceData?.users || [];
    const attendance: Record<string, Record<string, AttendanceEntry>> =
        attendanceData?.attendance || {};
    const timetrackingEntries = attendanceData?.timetrackingEntries || [];
    const leaveRequests: LeaveRequest[] = leaveData?.requests || [];

    const weeklyItems = useMemo(() => {
        const attendanceItems = buildAttendanceCalendarItems(
            users.flatMap((user) =>
                Object.entries(attendance[user.id] || {}).flatMap(([date, entry]) => {
                    if (entry.status === "presente" && entry.autoDetected) {
                        return [];
                    }

                    return [
                        {
                            userId: user.id,
                            userName: user.name,
                            userPicture: user.picture,
                            status: entry.status,
                            date,
                            notes: entry.notes,
                        },
                    ];
                })
            )
        );

        const hoursItems = buildTimetrackingCalendarItems(
            timetrackingEntries,
            domain
        );

        return [...attendanceItems, ...hoursItems];
    }, [attendance, domain, timetrackingEntries, users]);

    const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {view !== "annual" && (
                        <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                                <SelectTrigger className="w-[130px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTH_NAMES.map((name, i) => (
                                        <SelectItem key={i} value={(i + 1).toString()}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[90px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map((y) => (
                                <SelectItem key={y} value={y.toString()}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Tabs
                        value={view}
                        onValueChange={(v) =>
                            setView(v as "weekly" | "monthly" | "annual")
                        }
                    >
                        <TabsList className="h-8">
                            <TabsTrigger value="weekly" className="text-xs h-7 gap-1.5 px-3">
                                <Rows3 className="h-3.5 w-3.5" />
                                Settimanale
                            </TabsTrigger>
                            <TabsTrigger value="monthly" className="text-xs h-7 gap-1.5 px-3">
                                <Calendar className="h-3.5 w-3.5" />
                                Mensile
                            </TabsTrigger>
                            <TabsTrigger value="annual" className="text-xs h-7 gap-1.5 px-3">
                                <LayoutGrid className="h-3.5 w-3.5" />
                                Annuale
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Legend */}
            <AttendanceLegend />

            {/* Stats */}
            {!loadingAttendance && <AttendanceStats users={users} attendance={attendance} />}

            {/* Grid */}
            <Card>
                <CardContent className="p-4">
                    {loadingAttendance ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                    <div className="flex gap-1 flex-1">
                                        {Array.from({ length: 20 }).map((_, j) => (
                                            <Skeleton key={j} className="h-6 w-6 rounded-sm" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                                Nessun dipendente trovato per questo sito
                            </p>
                        </div>
                    ) : view === "weekly" ? (
                        <WeeklyCalendarView
                            items={weeklyItems}
                            mode={isAdmin ? "admin" : "personal"}
                            currentUserId={currentUserId}
                            targetConfig={
                                isAdmin
                                    ? undefined
                                    : { weekdayMinutes: 540, fridayMinutes: 360 }
                            }
                            title="Planner presenze e ore"
                            description="Vista settimanale unificata tra presenze, assenze e ore registrate."
                            emptyStateTitle="Nessuna presenza o registrazione trovata"
                            emptyStateDescription="Cambia periodo o aggiorna i filtri per analizzare la settimana."
                        />
                    ) : view === "monthly" ? (
                        <AttendanceMonthlyView
                            year={year}
                            month={month}
                            users={users}
                            attendance={attendance}
                            isAdmin={isAdmin}
                            onStatusChange={handleStatusChange}
                        />
                    ) : (
                        <AttendanceAnnualView
                            year={year}
                            users={users}
                            attendance={attendance}
                            isAdmin={isAdmin}
                            onStatusChange={handleStatusChange}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Leave requests panel */}
            {(isAdmin || leaveRequests.length > 0) && (
                <LeaveRequestsPanel
                    requests={leaveRequests}
                    isAdmin={isAdmin}
                    isLoading={reviewLeave.isPending}
                    onApprove={(id) => reviewLeave.mutate({ id, status: "approved" })}
                    onReject={(id) => reviewLeave.mutate({ id, status: "rejected" })}
                />
            )}
        </div>
    );
}
