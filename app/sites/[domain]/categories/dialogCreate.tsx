"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateForm from "./createForm";

function DialogCreate({
  domain,
  canManageImages = false,
}: {
  domain: string;
  canManageImages?: boolean;
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Aggiungi categoria</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Crea categoria</DialogTitle>
          <DialogDescription>Crea una nuova categoria</DialogDescription>
        </DialogHeader>
        <CreateForm
          domain={domain}
          canManageImages={canManageImages}
          handleClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
