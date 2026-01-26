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
import { Data } from "./page";
import { Plus } from "lucide-react";

type Props = {
  data: Data;
};

function DialogCreate({ data }: Props) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi progetto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[50%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Crea progetto</DialogTitle>
          <DialogDescription>Crea un progetto nuovo</DialogDescription>
        </DialogHeader>
        <CreateProductForm data={data} handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
