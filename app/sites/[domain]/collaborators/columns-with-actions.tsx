"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Collaborator } from "./columns";
import { CollaboratorActions } from "./collaborator-actions";
import { AgentActions } from "./agent-actions";

const getRoleBadgeVariant = (role: string | null, isOrgAdmin?: boolean) => {
  if (isOrgAdmin || role === "org_admin") return "default";
  if (role === "agent") return "outline";
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
  if (role === "agent") return "Agente AI";
  switch (role) {
    case "admin":
      return "Amministratore";
    case "user":
      return "Utente";
    default:
      return role || "N/A";
  }
};

export function getColumnsWithActions(
  siteId: string,
  domain: string,
  isAdmin: boolean,
  currentUserRole?: string
): ColumnDef<Collaborator>[] {
  const baseColumns: ColumnDef<Collaborator>[] = [
    {
      accessorKey: "picture",
      header: "",
      cell: ({ row }) => {
        const { picture, given_name, family_name, initials, color } =
          row.original;
        const displayInitials =
          initials ||
          `${given_name?.charAt(0) || ""}${
            family_name?.charAt(0) || ""
          }`.toUpperCase() ||
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
        const { email, is_virtual_agent } = row.original;
        if (is_virtual_agent) {
          return <span className="text-muted-foreground">{email}</span>;
        }
        return (
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        );
      },
    },
    {
      accessorKey: "company_role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ruolo Aziendale" />
      ),
      cell: ({ row }) => {
        const { company_role } = row.original;
        if (!company_role)
          return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm">{company_role}</span>;
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ruolo Sistema" />
      ),
      cell: ({ row }) => {
        const { role, is_virtual_agent } = row.original;
        return (
          <Badge
            variant={getRoleBadgeVariant(role)}
            className={is_virtual_agent ? "border-violet-500/50 text-violet-200" : undefined}
          >
            {getRoleLabel(role)}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "enabled",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stato" />
      ),
      cell: ({ row }) => {
        const { enabled, is_virtual_agent } = row.original;
        if (is_virtual_agent) {
          return (
            <Badge variant="outline" className="border-violet-500/40 text-violet-200">
              Agente Attivo
            </Badge>
          );
        }
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

  // Add actions column only for admins
  if (isAdmin) {
    baseColumns.push({
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.is_virtual_agent ? (
          <AgentActions
            collaborator={row.original}
            siteId={siteId}
            domain={domain}
          />
        ) : (
          <CollaboratorActions
            collaborator={row.original}
            siteId={siteId}
            domain={domain}
            isAdmin={isAdmin}
            currentUserRole={currentUserRole}
          />
        ),
      enableSorting: false,
    });
  }

  return baseColumns;
}
