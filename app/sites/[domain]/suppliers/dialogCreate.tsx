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

function DialogCreate({ data, domain }: { data: any[]; domain: string }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} className="shrink-0 whitespace-nowrap">
          Aggiungi fornitore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Nuovo fornitore</DialogTitle>
          <DialogDescription>Crea un nuovo fornitore</DialogDescription>
        </DialogHeader>
        <CreateProductForm
          data={data}
          domain={domain}
          handleClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
