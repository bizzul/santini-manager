"use client";
import React, { useState } from "react";
import { Button } from "@tremor/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import CreateRoleForm from "./createRoleForm";
import { Roles } from "@prisma/client";

function DialogCreate() {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <div>
          <Button className="pointer-events-auto" onClick={() => setOpen(true)}>
            Aggiungi ruolo utente
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Nuovo ruolo</DialogTitle>
          <DialogDescription>Crea un nuovo ruolo</DialogDescription>
        </DialogHeader>
        <CreateRoleForm handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
