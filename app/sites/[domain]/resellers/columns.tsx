"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Reseller } from "@/types/supabase";
import type { Translator } from "@/lib/i18n";

export const createColumns = (
  domain: string,
  t: Translator
): ColumnDef<Reseller>[] => {
  return [
    {
      accessorKey: "country",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resellers.columnCountry")} />
      ),
      cell: ({ row }) => {
        const countryCode = row.original.country_code;
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            {countryCode && (
              <img
                src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                alt={countryCode}
                title={countryCode}
                className="h-4 w-4 shrink-0 rounded-[3px] border border-border object-cover"
                loading="lazy"
              />
            )}
            <span className="font-medium">{row.original.country || "-"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resellers.columnName")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "contact_person",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resellers.columnContact")} />
      ),
      cell: ({ row }) => row.original.contact_person || "-",
    },
    {
      accessorKey: "address",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resellers.columnAddress")} />
      ),
      cell: ({ row }) => {
        const parts = [row.original.address, row.original.zip_city].filter(
          Boolean
        );
        return parts.length > 0 ? parts.join(", ") : "-";
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resellers.columnPhone")} />
      ),
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resellers.columnEmail")} />
      ),
      cell: ({ row }) =>
        row.original.email ? (
          <a
            href={`mailto:${row.original.email}`}
            className="text-primary hover:underline"
          >
            {row.original.email}
          </a>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "website",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resellers.columnWebsite")} />
      ),
      cell: ({ row }) => {
        const website = row.original.website;
        if (!website) return "-";
        const href = website.startsWith("http") ? website : `https://${website}`;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {website}
          </a>
        );
      },
    },
    {
      id: "actions",
      header: t("resellers.columnActions"),
      cell: ({ row }) => <DataTableRowActions row={row} domain={domain} />,
    },
  ];
};
