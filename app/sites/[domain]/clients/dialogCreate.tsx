"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateProductForm from "./createForm";

function DialogCreate() {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0 whitespace-nowrap">
          Aggiungi cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[60%] max-h-[90%] overflow-scroll ">
        <DialogHeader>
          <DialogTitle>Crea nuovo cliente</DialogTitle>
          {/* <DialogDescription>Crea un cliente nuovo</DialogDescription> */}
        </DialogHeader>
        <CreateProductForm handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
