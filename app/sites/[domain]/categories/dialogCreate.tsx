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
} from "@/components/ui/dialog";
import CreateForm from "./createForm";

function DialogCreate({ domain }: { domain: string }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <div className="container flex justify-end pt-12 overflow-hidden pointer-events-none ">
          <Button className="pointer-events-auto" onClick={() => setOpen(true)}>
            Aggiungi categoria
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Crea categoria</DialogTitle>
          <DialogDescription>Crea una nuova categoria</DialogDescription>
        </DialogHeader>
        <CreateForm domain={domain} handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
