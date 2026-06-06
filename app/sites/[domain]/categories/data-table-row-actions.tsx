"use client";

import { ImageIcon, Pencil } from "lucide-react";
import { Row } from "@tanstack/react-table";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogCategoryImage } from "@/components/categories/dialog-category-image";
import type { CategoryTableRow } from "@/types/category-cards";

import DialogDelete from "./dialogDelete";
import DialogEdit from "./dialogEdit";

interface DataTableRowActionsProps {
  row: Row<CategoryTableRow>;
  domain: string;
  canManageImages?: boolean;
}

export function DataTableRowActions({
  row,
  domain,
  canManageImages = false,
}: DataTableRowActionsProps) {
  const data = row.original;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<CategoryTableRow | null>(
    null,
  );

  function handleDeleteClick(rowData: CategoryTableRow) {
    setSelectedData(rowData);
    setDeleteOpen(true);
  }

  function handleEditClick(rowData: CategoryTableRow) {
    setSelectedData(rowData);
    setEditOpen(true);
  }

  function handleImageClick(rowData: CategoryTableRow) {
    setSelectedData(rowData);
    setImageOpen(true);
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
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(data.id)}
          >
            Copia ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleEditClick(data)}>
            Modifica
          </DropdownMenuItem>
          {canManageImages && (
            <>
              <DropdownMenuItem onClick={() => handleImageClick(data)}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Gestisci immagine
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => handleDeleteClick(data)}>
            Elimina
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedData && (
        <>
          <DialogDelete
            isOpen={deleteOpen}
            data={selectedData}
            domain={domain}
            setData={setSelectedData}
            setOpen={setDeleteOpen}
          />
          <DialogEdit
            isOpen={editOpen}
            data={selectedData}
            domain={domain}
            setData={setSelectedData}
            setOpen={setEditOpen}
          />
          {canManageImages && (
            <DialogCategoryImage
              open={imageOpen}
              onOpenChange={setImageOpen}
              domain={domain}
              categoryId={selectedData.id}
              categoryName={selectedData.name}
              currentUrl={selectedData.image_url}
            />
          )}
        </>
      )}
    </>
  );
}
