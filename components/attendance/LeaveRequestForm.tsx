"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/use-toast";
import {
    Send,
    CalendarDays,
    Clock,
    CheckCircle2,
    XCircle,
    Palmtree,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
    LeaveRequest,
    LeaveType,
    LEAVE_TYPE_LABELS,
    LEAVE_STATUS_LABELS,
} from "./attendance-types";

interface LeaveRequestFormProps {
    domain: string;
}

async function fetchMyLeaveRequests(domain: string): Promise<{ requests: LeaveRequest[] }> {
    const response = await fetch(`/api/sites/${domain}/leave-requests`);
    if (!response.ok) throw new Error("Failed to fetch leave requests");
    return response.json();
}

export function LeaveRequestForm({ domain }: LeaveRequestFormProps) {
    const [leaveType, setLeaveType] = useState<LeaveType | "">("");
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [notes, setNotes] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["leave-requests", domain, "my"],
        queryFn: () => fetchMyLeaveRequests(domain),
        staleTime: 2 * 60 * 1000,
    });

    const submitRequest = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/sites/${domain}/leave-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    leave_type: leaveType,
                    start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
                    end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
                    notes: notes || null,
                }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Errore nell'invio");
            }
            return response.json();
        },
        onSuccess: () => {
            toast({ description: "Richiesta inviata con successo!" });
            setLeaveType("");
            setStartDate(undefined);
            setEndDate(undefined);
            setNotes("");
            queryClient.invalidateQueries({ queryKey: ["leave-requests", domain] });
        },
        onError: (error: Error) => {
            toast({ description: error.message, variant: "destructive" });
        },
    });

    const myRequests = data?.requests || [];
    const pendingCount = myRequests.filter((r) => r.status === "pending").length;

    const canSubmit = leaveType && startDate && endDate && !submitRequest.isPending;

    return (
        <div className="space-y-6">
            {/* Request form */}
            <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Palmtree className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Nuova richiesta</CardTitle>
                            <CardDescription>
                                Richiedi vacanze, comunica malattia o infortunio
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo</label>
                        <Select
                            value={leaveType}
                            onValueChange={(v) => setLeaveType(v as LeaveType)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Data inizio</label>
                            <DatePicker
                                date={startDate}
                                onValueChange={setStartDate}
                                placeholder="Inizio"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Data fine</label>
                            <DatePicker
                                date={endDate}
                                onValueChange={setEndDate}
                                placeholder="Fine"
                                minDate={startDate}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Note (opzionale)</label>
                        <Input
                            placeholder="Motivo o dettagli..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <Button
                        className="w-full"
                        disabled={!canSubmit}
                        onClick={() => submitRequest.mutate()}
                    >
                        {submitRequest.isPending ? (
                            <span className="animate-spin mr-2">...</span>
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        Invia richiesta
                    </Button>
                </CardContent>
            </Card>

            {/* My requests */}
            {myRequests.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Le mie richieste</CardTitle>
                            {pendingCount > 0 && (
                                <Badge variant="secondary">
                                    {pendingCount} in attesa
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {myRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                >
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className="text-xs">
                                                {LEAVE_TYPE_LABELS[req.leave_type]}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    req.status === "approved"
                                                        ? "default"
                                                        : req.status === "rejected"
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                                className="text-xs gap-1"
                                            >
                                                {req.status === "approved" && (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                )}
                                                {req.status === "rejected" && (
                                                    <XCircle className="h-3 w-3" />
                                                )}
                                                {req.status === "pending" && (
                                                    <Clock className="h-3 w-3" />
                                                )}
                                                {LEAVE_STATUS_LABELS[req.status]}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <CalendarDays className="h-3 w-3" />
                                            {format(new Date(req.start_date), "d MMM", {
                                                locale: it,
                                            })}
                                            {req.start_date !== req.end_date && (
                                                <>
                                                    {" - "}
                                                    {format(new Date(req.end_date), "d MMM yyyy", {
                                                        locale: it,
                                                    })}
                                                </>
                                            )}
                                            {req.start_date === req.end_date && (
                                                <>
                                                    {" "}
                                                    {format(new Date(req.start_date), "yyyy", {
                                                        locale: it,
                                                    })}
                                                </>
                                            )}
                                        </div>
                                        {req.notes && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {req.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
