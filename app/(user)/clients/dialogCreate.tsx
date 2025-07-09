"use client";
import React, { useState } from "react";
import { Button } from "@tremor/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import CreateProductForm from "./createForm";

function DialogCreate() {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <div className="container flex justify-end pt-12 overflow-hidden pointer-events-none ">
          <Button className="pointer-events-auto" onClick={() => setOpen(true)}>
            Aggiungi cliente
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[60%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Crea cliente</DialogTitle>
          <DialogDescription>Crea un cliente nuovo</DialogDescription>
        </DialogHeader>
        <CreateProductForm handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
