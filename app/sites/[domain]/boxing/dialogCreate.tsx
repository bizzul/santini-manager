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
import CreateProductForm from "./createProductForm";

type Props = {};

function DialogCreate({}: Props) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <div className="container flex justify-end pt-12 overflow-hidden pointer-events-none ">
          <Button className="pointer-events-auto" onClick={() => setOpen(true)}>
            Aggiungi prodotto
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crea prodotto</DialogTitle>
          <DialogDescription>Crea un prodotto nuovo</DialogDescription>
        </DialogHeader>
        <CreateProductForm handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
