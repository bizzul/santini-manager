"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
        <div className=" flex justify-end pt-12 overflow-hidden cursor-pointer pointer-events-none hover:opacity-50 opacity-100 transition-opacity duration-300 ">
          <Button
            className="pointer-events-auto border dark:border-white"
            onClick={() => setOpen(true)}
          >
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
