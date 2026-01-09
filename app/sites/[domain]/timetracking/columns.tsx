"use client";

import { Roles, Timetracking } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { CheckSquare, XIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const columns: ColumnDef<Timetracking>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleziona tutti"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleziona riga"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "user",
    accessorFn: (row) =>
      //@ts-ignore
      row.user
        ? //@ts-ignore
          `${row.user.family_name} ${row.user.given_name}`
        : "Unknown User",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creato da" />
    ),
    id: "fullName",
    filterFn: "includesString",
    enableColumnFilter: true,
    enableGlobalFilter: true,
    cell: ({ row }) => {
      //@ts-ignore
      const { user } = row.original;
      if (user) {
        return `${user.family_name} ${user.given_name}`;
      }
      return "Unknown User";
    },
  },
  {
    accessorKey: "roles",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ruolo" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { roles } = row.original;
      if (roles?.length) {
        return (
          <ul>
            {roles.map((roleEntry: any, index: number) => (
              <li key={roleEntry.role?.id || index}>{roleEntry.role?.name}</li>
            ))}
          </ul>
        );
      } else {
        return "Nessun ruolo";
      }
    },
  },
  {
    accessorKey: "hours",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ore" />
    ),
  },
  {
    accessorKey: "minutes",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Minuti" />
    ),
  },
  {
    accessorKey: "totalTime",

    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Totale" />
    ),
    cell: ({ row }) => {
      const { totalTime } = row.original;
      if (!totalTime) return "0 ore e 0 minuti";

      const hours = Math.floor(totalTime);
      const minutes = Math.round((totalTime - hours) * 60);

      return `${hours} ore e ${minutes} minuti`;
    },
  },

  {
    accessorKey: "use_cnc",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNC" />
    ),
    cell: ({ row }) => {
      const { use_cnc } = row.original;
      if (use_cnc) {
        return <CheckSquare />;
      } else {
        return <XIcon />;
      }
    },
  },
  {
    accessorKey: "task.unique_code",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Progetto" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrizione" />
    ),
    // cell: ({ row }) => {
    //   const { website } = row.original;

    //   // Check if website includes the protocol, if not, prepend it.
    //   const formattedWebsite =
    //     website!.startsWith("http://") || website!.startsWith("https://")
    //       ? website
    //       : `http://${website}`;

    //   return (
    //     // Use a standard anchor tag for external URLs
    //     <a href={formattedWebsite!} target="_blank" rel="noopener noreferrer">
    //       {website}
    //     </a>
    //   );
    // },
  },
  {
    accessorKey: "description_type",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo Desc." />
    ),
    // cell: ({ row }) => {
    //   const { email } = row.original;
    //   return <a href={`mailto:${email}`}>{email}</a>;
    // },
  },
  {
    accessorKey: "data",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data" />
    ),
    cell: ({ row }) => {
      const { created_at } = row.original;

      // Check if website includes the protocol, if not, prepend it.
      if (!created_at) return <div>N/A</div>;

      const formattedDate = new Date(created_at).toLocaleDateString();

      return <div suppressHydrationWarning>{formattedDate}</div>;
    },
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
