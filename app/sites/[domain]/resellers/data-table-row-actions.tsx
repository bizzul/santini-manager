"use client";

import { Pencil } from "lucide-react";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DialogDelete from "./dialogDelete";
import { useState } from "react";
import DialogEdit from "./dialogEdit";
import { useT } from "@/components/i18n/i18n-provider";
import { Reseller } from "@/types/supabase";

interface DataTableRowActionsProps {
  row: Row<Reseller>;
  domain: string;
}

export function DataTableRowActions({ row, domain }: DataTableRowActionsProps) {
  const data = row.original;
  const t = useT();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">{t("common.actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogDelete
        isOpen={deleteOpen}
        data={data}
        setOpen={setDeleteOpen}
        domain={domain}
      />
      <DialogEdit
        isOpen={editOpen}
        data={data}
        setOpen={setEditOpen}
        domain={domain}
      />
    </>
  );
}
