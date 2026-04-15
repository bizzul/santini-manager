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
      <DialogContent className="sm:max-w-[740px] max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700/70 bg-slate-950/95 text-slate-100">
        <DialogHeader>
          <DialogTitle>Nuovo fornitore</DialogTitle>
          <DialogDescription className="text-slate-300">
            Inserisci i dati del fornitore con lo stesso layout dei container collaboratori.
          </DialogDescription>
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
