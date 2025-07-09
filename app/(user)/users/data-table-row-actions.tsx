"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";

import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";

import DialogDelete from "./dialogDelete";
import { useEffect, useState } from "react";
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
  //@ts-ignore
  const [enabled, setEnabled] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (data) {
      //@ts-ignore
      setEnabled(data.enabled);
    }
  }, [data]);

  const unblockUser = (userId: string) => {
    fetch(`/api/users/unblock/${userId}`, {
      method: "PATCH",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
      });
  };

  const blockUser = (userId: string) => {
    fetch(`/api/users/block/${userId}`, {
      method: "PATCH",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
      });
  };

  const passReset = (email: string) => {
    fetch("/api/users/passChange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          // toast
        } else {
          // toast
          setResetOpen(false);
        }
      });
  };

  function handleDeleteClick(row: any) {
    setSelectedData(row);
    setDeleteOpen(true);
  }

  function handleEditClick(row: any) {
    setSelectedData(row);
    setEditOpen(true);
  }

  function handleResetPassword(row: any) {
    setSelectedData(row);
    setResetOpen(true);
  }

  function handleBlockUnblock(row: any) {
    setSelectedData(row);
    console.log(row);
    if (enabled === true) {
      //@ts-ignore
      blockUser(data.user_id);
    } else {
      //@ts-ignore
      unblockUser(data.user_id);
    }
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
          <DropdownMenuItem onClick={() => handleBlockUnblock(data)}>
            {enabled ? "Blocca" : "Sblocca"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleResetPassword(data)}>
            Cambio password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleResetPassword(data)}>
            Gestisci Accesso App
          </DropdownMenuItem>

          {/* <DropdownMenuItem>Favorite</DropdownMenuItem> */}

          {/* <DropdownMenuSub>
          <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={task.label}>
              {labels.map((label) => (
                <DropdownMenuRadioItem key={label.value} value={label.value}>
                  {label.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub> */}
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

      <Dialog open={resetOpen} onOpenChange={() => setResetOpen(!resetOpen)}>
        <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
          <DialogHeader>
            <DialogTitle>Cambio password utente</DialogTitle>
            <DialogDescription>
              Inviare notifica per cambio password?
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              // @ts-ignore
              passReset(selectedData?.email);
            }}
          >
            Invia
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
