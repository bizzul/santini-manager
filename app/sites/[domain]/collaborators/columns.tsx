"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Collaborator type
export type Collaborator = {
    id: number;
    email: string;
    given_name: string | null;
    family_name: string | null;
    initials: string | null;
    picture: string | null;
    color: string | null;
    role: string | null;
    site_role: string | null;
    is_org_admin?: boolean;
    enabled: boolean;
    joined_site_at: string | null;
};

const getRoleBadgeVariant = (role: string | null, isOrgAdmin?: boolean) => {
    if (isOrgAdmin || role === "org_admin") return "default";
    switch (role) {
        case "admin":
            return "default";
        case "user":
            return "secondary";
        default:
            return "outline";
    }
};

const getRoleLabel = (role: string | null, isOrgAdmin?: boolean) => {
    if (isOrgAdmin || role === "org_admin") return "Admin Organizzazione";
    switch (role) {
        case "admin":
            return "Amministratore";
        case "user":
            return "Utente";
        default:
            return role || "N/A";
    }
};

export const columns: ColumnDef<Collaborator>[] = [
    {
        accessorKey: "picture",
        header: "",
        cell: ({ row }) => {
            const { picture, given_name, family_name, initials, color } =
                row.original;
            const displayInitials =
                initials ||
                `${given_name?.charAt(0) || ""}${family_name?.charAt(0) || ""}`.toUpperCase() ||
                "??";

            return (
                <Avatar className="h-10 w-10">
                    <AvatarImage src={picture || undefined} />
                    <AvatarFallback
                        style={{ backgroundColor: color || "#6366f1" }}
                        className="text-white font-medium"
                    >
                        {displayInitials}
                    </AvatarFallback>
                </Avatar>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: "given_name",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => {
            const { given_name, family_name } = row.original;
            const fullName =
                [given_name, family_name].filter(Boolean).join(" ") || "N/A";
            return <span className="font-medium">{fullName}</span>;
        },
    },
    {
        accessorKey: "email",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => {
            const { email } = row.original;
            return (
                <a
                    href={`mailto:${email}`}
                    className="text-primary hover:underline"
                >
                    {email}
                </a>
            );
        },
    },
    {
        accessorKey: "role",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Ruolo Sistema" />
        ),
        cell: ({ row }) => {
            const { role } = row.original;
            return (
                <Badge variant={getRoleBadgeVariant(role)}>
                    {getRoleLabel(role)}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: "site_role",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Ruolo Sito" />
        ),
        cell: ({ row }) => {
            const { site_role, is_org_admin } = row.original;
            if (!site_role) return <span className="text-muted-foreground">-</span>;
            return (
                <Badge variant={is_org_admin ? "default" : "outline"} className={is_org_admin ? "bg-blue-600" : ""}>
                    {getRoleLabel(site_role, is_org_admin)}
                </Badge>
            );
        },
    },
    {
        accessorKey: "enabled",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Stato" />
        ),
        cell: ({ row }) => {
            const { enabled } = row.original;
            return enabled ? (
                <Badge variant="default" className="bg-green-600">
                    Attivo
                </Badge>
            ) : (
                <Badge variant="destructive">Disabilitato</Badge>
            );
        },
    },
    {
        accessorKey: "joined_site_at",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Data Aggiunta" />
        ),
        cell: ({ row }) => {
            const { joined_site_at } = row.original;
            if (!joined_site_at)
                return <span className="text-muted-foreground">N/A</span>;
            try {
                return format(new Date(joined_site_at), "dd MMM yyyy", {
                    locale: it,
                });
            } catch {
                return <span className="text-muted-foreground">N/A</span>;
            }
        },
    },
];

