"use client";

import { User } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../../components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import Image from "next/image";
export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "picture",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Immagine" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { picture } = row.original;
      return (
        picture !== null && (
          <Image src={picture} alt={picture} width={50} height={50} />
        )
      );
    },
  },
  {
    accessorKey: "email",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "family_name",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cognome" />
    ),
  },
  {
    accessorKey: "given_name",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },

  {
    accessorKey: "created_at",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creato." />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { created_at } = row.original;

      const date = new Date(created_at);
      const formattedDate = date.toLocaleDateString();

      return <div suppressHydrationWarning>{formattedDate}</div>;
    },
  },
  {
    accessorKey: "email_verified",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Verificato?" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { email_verified } = row.original;

      return email_verified ? (
        <span className="inline-flex items-center p-1 mr-2 text-sm font-semibold text-gray-800 bg-green-400 rounded-full dark:bg-gray-700 dark:text-gray-300">
          <svg
            aria-hidden="true"
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            ></path>
          </svg>
          <span className="sr-only">Verificato</span>
        </span>
      ) : (
        <span className="inline-flex items-center p-1 mr-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300">
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
          <span className="sr-only">Verificato</span>
        </span>
      );
    },
  },
  {
    accessorKey: "enabled",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Attivo?" />
    ),
    cell: ({ row }) => {
      const { enabled } = row.original;

      return enabled ? (
        <span className="inline-flex items-center p-1 mr-2 text-sm font-semibold text-gray-800 bg-green-400 rounded-full dark:bg-gray-700 dark:text-gray-300">
          <svg
            aria-hidden="true"
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            ></path>
          </svg>
          <span className="sr-only">Attivo</span>
        </span>
      ) : (
        <span className="inline-flex items-center p-1 mr-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300">
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
          <span className="sr-only">Attivo</span>
        </span>
      );
    },
  },
  {
    accessorKey: "incarichi",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Incarichi" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { incarichi } = row.original;
      return incarichi.map((incarico: any, index: any) => (
        <div key={index} className=" flex flex-col gap-1">
          <p>{incarico.name}</p>
        </div>
      ));
    },
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
