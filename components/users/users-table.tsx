"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ImpersonateButton from "@/components/users/impersonateButton";
import PasswordResetButton from "@/components/users/password-reset-button";
import ToggleUserStatusButton from "@/components/users/toggle-user-status-button";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import AssistanceLevelSelector from "@/components/users/assistance-level-selector";
import UserAccessCell from "@/components/users/user-access-cell";

type AccessItem = { id: string; name: string; organizationName?: string };

export type TableUser = {
  id: string;
  email: string;
  given_name: string;
  family_name: string;
  role: string;
  enabled: boolean;
  assistance_level: "basic_tutorial" | "smart_support" | "advanced_support";
  picture: string | null;
  color: string | null;
  initials: string | null;
  organizations: AccessItem[];
  sites: AccessItem[];
};

interface UsersTableProps {
  users: TableUser[];
  isSuperadmin: boolean;
  currentUserId?: string;
}

type SortColumn = "organizations" | "sites" | "status";
type SortDirection = "asc" | "desc";

const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
];

function getAvatarColor(seed: string, stored?: string | null) {
  if (stored) return stored;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(
  given?: string | null,
  family?: string | null,
  fallback?: string | null,
  email?: string
) {
  if (fallback) return fallback.toUpperCase();
  const g = given && given !== "-" ? given.charAt(0) : "";
  const f = family && family !== "-" ? family.charAt(0) : "";
  const initials = `${g}${f}`.trim();
  if (initials) return initials.toUpperCase();
  return (email?.charAt(0) || "?").toUpperCase();
}

export default function UsersTable({
  users,
  isSuperadmin,
  currentUserId,
}: UsersTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortValue = (u: TableUser, column: SortColumn): string | number => {
    switch (column) {
      case "organizations":
        return u.organizations
          .map((o) => o.name.toLowerCase())
          .sort()
          .join(", ");
      case "sites":
        return u.sites.map((s) => s.name.toLowerCase()).sort().join(", ");
      case "status":
        return u.enabled ? 1 : 0;
    }
  };

  const sortedUsers = useMemo(() => {
    if (!sortColumn) return users;
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...users].sort((a, b) => {
      const av = sortValue(a, sortColumn);
      const bv = sortValue(b, sortColumn);
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
  }, [users, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const SortableHeader = ({
    column,
    label,
    className,
  }: {
    column: SortColumn;
    label: string;
    className?: string;
  }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider ${className || ""}`}
    >
      <button
        type="button"
        onClick={() => handleSort(column)}
        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-white transition-colors"
      >
        {label}
        <SortIcon column={column} />
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-white/5">
          <tr>
            <th className="w-12 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              <span className="sr-only">Avatar</span>
            </th>
            <th className="w-40 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Nome
            </th>
            <th className="w-56 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Email
            </th>
            <th className="w-16 px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Ruolo
            </th>
            <SortableHeader
              column="organizations"
              label="Organizzazioni"
              className="w-[220px]"
            />
            <SortableHeader column="sites" label="Siti" className="w-[220px]" />
            <th className="w-[220px] px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Assistenza
            </th>
            <SortableHeader column="status" label="Stato" className="w-24" />
            <th className="w-[120px] px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
              Azioni
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {sortedUsers.length > 0 ? (
            sortedUsers.map((u) => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-3 align-top">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.picture || undefined} />
                    <AvatarFallback
                      style={{
                        backgroundColor: getAvatarColor(
                          u.id || u.email,
                          u.color
                        ),
                      }}
                      className="text-white text-sm font-medium"
                    >
                      {getInitials(
                        u.given_name,
                        u.family_name,
                        u.initials,
                        u.email
                      )}
                    </AvatarFallback>
                  </Avatar>
                </td>
                <td className="px-3 py-3 align-top">
                  <span className="font-medium text-white">
                    {[u.given_name, u.family_name]
                      .filter((v) => v && v !== "-")
                      .join(" ") || "-"}
                  </span>
                </td>
                <td className="px-3 py-3 align-top text-sm text-white/80 break-all">
                  {u.email}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <UserAccessCell
                    userId={u.id}
                    organizations={u.organizations}
                    sites={[]}
                    emptyLabel="Nessuna organizzazione"
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <UserAccessCell
                    userId={u.id}
                    organizations={[]}
                    sites={u.sites}
                    emptyLabel="Nessun sito"
                  />
                </td>
                <td className="px-3 py-3 align-top text-white/80 text-sm">
                  {isSuperadmin ? (
                    <AssistanceLevelSelector
                      userId={u.id}
                      initialLevel={u.assistance_level}
                    />
                  ) : u.assistance_level === "advanced_support" ? (
                    "Livello C"
                  ) : u.assistance_level === "smart_support" ? (
                    "Livello B"
                  ) : (
                    "Livello A"
                  )}
                </td>
                <td className="px-3 py-3 align-top whitespace-nowrap">
                  <Badge
                    variant={u.enabled ? "default" : "secondary"}
                    className={
                      u.enabled
                        ? "bg-green-500/20 text-green-200 border border-green-400/50"
                        : "bg-gray-500/20 text-gray-200 border border-gray-400/50"
                    }
                  >
                    {u.enabled ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="grid grid-cols-3 gap-1 w-fit">
                    <Link href={`/administration/users/${u.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        title="View"
                        aria-label="View"
                        className="h-8 w-8 p-0 border border-white/40 text-white hover:bg-white/20"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/administration/users/${u.id}/edit`}>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Edit"
                        aria-label="Edit"
                        className="h-8 w-8 p-0 border border-white/40 text-white hover:bg-white/20"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <PasswordResetButton
                      userEmail={u.email}
                      userName={
                        `${u.given_name} ${u.family_name}`.trim() || u.email
                      }
                      compact
                    />
                    <ToggleUserStatusButton
                      userId={u.id}
                      isActive={u.enabled}
                      userEmail={u.email}
                      compact
                    />
                    <DeleteUserButton
                      userId={u.id}
                      userEmail={u.email}
                      userName={
                        `${u.given_name} ${u.family_name}`.trim() || u.email
                      }
                      disabled={u.id === currentUserId}
                    />
                    {isSuperadmin &&
                      u.role !== "superadmin" &&
                      u.id !== currentUserId && (
                        <ImpersonateButton userId={u.id} compact />
                      )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-white/60">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
