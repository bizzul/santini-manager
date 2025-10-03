"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DialogEdit from "./dialogEdit";
import { archiveItem } from "./actions/archived-item-action";
import { removeItem } from "./actions/delete-item.action";
import { useToast } from "@/components/ui/use-toast";
import { useParams } from "next/navigation";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const data = row.original;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedData, setSelectedData] = useState();
  const { toast } = useToast();
  const params = useParams();
  const domain = params?.domain as string;
  function handleEditClick(row: any) {
    setSelectedData(row);
    setEditOpen(true);
  }

  async function handleArchivia(row: any) {
    if (row.archived) {
      await archiveItem(false, row.id);
    } else {
      await archiveItem(true, row.id);
    }
  }

  async function handleDelete(row: any) {
    const response = await removeItem(row.id, domain);
    if (response?.message) {
      toast({
        description: `Errore! ${response.message}`,
      });
    } else {
      toast({
        description: `Elemento eliminato!`,
      });
    }
    setDeleteOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Apri menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            //@ts-expect-error
            onClick={() => navigator.clipboard.writeText(data.id.toString())}
          >
            Copia ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleEditClick(data)}>
            Modifica
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleArchivia(data)}>
            {/* @ts-ignore */}
            {data.archived ? "Disarchivia" : "Archivia"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)}>
            Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sei sicuro di voler eliminare?</DialogTitle>
            <DialogDescription>
              Questa azione non può essere annullata. Questo eliminerà
              permanentemente il tuo progetto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(data)}>
              Elimina
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DialogEdit
        isOpen={editOpen}
        data={selectedData}
        setData={setSelectedData}
        setOpen={setEditOpen}
      />
    </>
  );
}
