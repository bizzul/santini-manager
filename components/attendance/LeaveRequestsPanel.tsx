"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Check, X, Clock, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
    LeaveRequest,
    LEAVE_TYPE_LABELS,
    LEAVE_STATUS_LABELS,
} from "./attendance-types";

interface LeaveRequestsPanelProps {
    requests: LeaveRequest[];
    isAdmin: boolean;
    isLoading: boolean;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
}

function getStatusBadgeVariant(status: string) {
    switch (status) {
        case "approved":
            return "default" as const;
        case "rejected":
            return "destructive" as const;
        default:
            return "secondary" as const;
    }
}

export function LeaveRequestsPanel({
    requests,
    isAdmin,
    isLoading,
    onApprove,
    onReject,
}: LeaveRequestsPanelProps) {
    const pendingRequests = requests.filter((r) => r.status === "pending");
    const pastRequests = requests.filter((r) => r.status !== "pending");

    return (
        <div className="space-y-4">
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <CardTitle className="text-base">
                                Richieste in attesa
                            </CardTitle>
                            <Badge variant="secondary" className="ml-auto">
                                {pendingRequests.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingRequests.map((req) => (
                            <div
                                key={req.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                            >
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium">
                                            {req.user_name}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {LEAVE_TYPE_LABELS[req.leave_type]}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <CalendarDays className="h-3 w-3" />
                                        {format(new Date(req.start_date), "d MMM", { locale: it })}
                                        {req.start_date !== req.end_date && (
                                            <>
                                                {" - "}
                                                {format(new Date(req.end_date), "d MMM yyyy", { locale: it })}
                                            </>
                                        )}
                                        {req.start_date === req.end_date && (
                                            <> {format(new Date(req.start_date), "yyyy", { locale: it })}</>
                                        )}
                                    </div>
                                    {req.notes && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {req.notes}
                                        </p>
                                    )}
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1.5 ml-3 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                            onClick={() => onApprove?.(req.id)}
                                            disabled={isLoading}
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-7 px-2"
                                            onClick={() => onReject?.(req.id)}
                                            disabled={isLoading}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Past requests */}
            {pastRequests.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Storico richieste</CardTitle>
                        <CardDescription className="text-xs">
                            Richieste approvate e rifiutate
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {pastRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className="flex items-center justify-between p-2.5 rounded-lg border"
                                >
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium">
                                                {req.user_name}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {LEAVE_TYPE_LABELS[req.leave_type]}
                                            </Badge>
                                            <Badge
                                                variant={getStatusBadgeVariant(req.status)}
                                                className="text-xs"
                                            >
                                                {LEAVE_STATUS_LABELS[req.status]}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <CalendarDays className="h-3 w-3" />
                                            {format(new Date(req.start_date), "d MMM", { locale: it })}
                                            {req.start_date !== req.end_date && (
                                                <>
                                                    {" - "}
                                                    {format(new Date(req.end_date), "d MMM yyyy", { locale: it })}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {pendingRequests.length === 0 && pastRequests.length === 0 && (
                <Card>
                    <CardContent className="py-8 text-center">
                        <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                            Nessuna richiesta di ferie
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
