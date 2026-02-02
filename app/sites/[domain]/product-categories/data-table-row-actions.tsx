"use client";

import { Pencil } from "lucide-react";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DialogDelete from "./dialogDelete";
import { useState } from "react";
import DialogEdit from "./dialogEdit";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const data = row.original;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedData, setSelectedData] = useState();

  function handleDeleteClick(row: any) {
    setSelectedData(row);
    setDeleteOpen(true);
  }

  function handleEditClick(row: any) {
    setSelectedData(row);
    setEditOpen(true);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Apri menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            // @ts-expect-error
            onClick={() => navigator.clipboard.writeText(data.id.toString())}
          >
            Copia ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleEditClick(data)}>
            Modifica
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDeleteClick(data)}>
            Elimina
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* MODALS */}
      {selectedData && (
        <>
          <DialogDelete
            isOpen={deleteOpen}
            data={selectedData}
            setData={setSelectedData}
            setOpen={setDeleteOpen}
          />
          <DialogEdit
            isOpen={editOpen}
            data={selectedData}
            setData={setSelectedData}
            setOpen={setEditOpen}
          />
        </>
      )}
    </>
  );
}
