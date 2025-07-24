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
import CreateProductForm from "./createForm";
import { Product_category } from "@prisma/client";

function DialogCreate({ data }: { data: Product_category[] }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <div className="container flex justify-end pt-12 overflow-hidden pointer-events-none ">
          <Button className="pointer-events-auto" onClick={() => setOpen(true)}>
            Aggiungi fornitore
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Nuovo fornitore</DialogTitle>
          <DialogDescription>Crea un nuovo fornitore</DialogDescription>
        </DialogHeader>
        <CreateProductForm data={data} handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
