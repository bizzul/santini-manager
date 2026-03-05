export type AttendanceStatus =
    | "presente"
    | "vacanze"
    | "malattia"
    | "infortunio"
    | "smart_working"
    | "formazione"
    | "assenza_privata";

export type LeaveType = "vacanze" | "malattia" | "infortunio" | "smart_working" | "formazione" | "assenza_privata";
export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export interface AttendanceEntry {
    status: AttendanceStatus;
    notes: string | null;
    autoDetected: boolean;
}

export interface AttendanceUser {
    id: string;
    name: string;
    email: string | null;
    picture: string | null;
}

export interface LeaveRequest {
    id: string;
    site_id: string;
    user_id: string;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    notes: string | null;
    status: LeaveRequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    user_name: string;
    user_email: string | null;
}

export const STATUS_CONFIG: Record<
    AttendanceStatus | "weekend",
    { label: string; color: string; bgClass: string; textClass: string }
> = {
    presente: {
        label: "Presente",
        color: "#22c55e",
        bgClass: "bg-green-500",
        textClass: "text-green-700 dark:text-green-400",
    },
    vacanze: {
        label: "Vacanze",
        color: "#3b82f6",
        bgClass: "bg-blue-500",
        textClass: "text-blue-700 dark:text-blue-400",
    },
    malattia: {
        label: "Malattia",
        color: "#ef4444",
        bgClass: "bg-red-500",
        textClass: "text-red-700 dark:text-red-400",
    },
    infortunio: {
        label: "Infortunio",
        color: "#f97316",
        bgClass: "bg-orange-500",
        textClass: "text-orange-700 dark:text-orange-400",
    },
    smart_working: {
        label: "Smart Working",
        color: "#06b6d4",
        bgClass: "bg-cyan-500",
        textClass: "text-cyan-700 dark:text-cyan-400",
    },
    formazione: {
        label: "Formazione",
        color: "#a855f7",
        bgClass: "bg-purple-500",
        textClass: "text-purple-700 dark:text-purple-400",
    },
    assenza_privata: {
        label: "Assenza privata",
        color: "#6b7280",
        bgClass: "bg-gray-600",
        textClass: "text-gray-700 dark:text-gray-400",
    },
    weekend: {
        label: "Weekend",
        color: "#e5e7eb",
        bgClass: "bg-gray-200 dark:bg-gray-700",
        textClass: "text-gray-400",
    },
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    vacanze: "Vacanze",
    malattia: "Malattia",
    infortunio: "Infortunio",
    smart_working: "Smart Working",
    formazione: "Formazione",
    assenza_privata: "Assenza privata",
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
    pending: "In attesa",
    approved: "Approvata",
    rejected: "Rifiutata",
};
