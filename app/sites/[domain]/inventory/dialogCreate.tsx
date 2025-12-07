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
import CreateProductForm from "./createForm";
import DialogImportCSV from "./dialogImportCSV";

function DialogCreate({ data }: { data: any }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <div className="container flex justify-end gap-3 pt-12 overflow-hidden pointer-events-none">
      <div className="pointer-events-auto">
        <DialogImportCSV />
      </div>
      <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
        <DialogTrigger asChild>
          <Button className="pointer-events-auto" onClick={() => setOpen(true)}>
            Aggiungi prodotto
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
          <DialogHeader>
            <DialogTitle>Crea prodotto</DialogTitle>
            <DialogDescription>Crea un prodotto nuovo</DialogDescription>
          </DialogHeader>
          <CreateProductForm data={data} handleClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DialogCreate;
