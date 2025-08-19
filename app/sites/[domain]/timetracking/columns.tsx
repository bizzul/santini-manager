"use client";

import { Roles, Timetracking } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { CheckSquare, XIcon } from "lucide-react";
export const columns: ColumnDef<Timetracking>[] = [
  {
    // accessorKey: "user",
    //@ts-ignore
    accessorFn: (row) => `${row.user.family_name} ${row.user.given_name}`,
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
      return `${user.family_name} ${user.given_name}`;
    },
  },
  {
    accessorKey: "roles",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reparto" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { roles } = row.original;
      if (roles.length) {
        return (
          <ul>
            {roles.map((role: Roles) => (
              <li key={role.id}>{role.name}</li>
            ))}
          </ul>
        );
      } else {
        return <p>roles.name</p>;
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
