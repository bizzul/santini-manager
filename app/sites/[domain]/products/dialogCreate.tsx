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
import CreateProductForm from "./createProductForm";

type Props = {
  domain: string;
  siteId: string;
};

function DialogCreate({ domain, siteId }: Props) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <Button
          onClick={() => setOpen(true)}
          className="shrink-0 whitespace-nowrap"
        >
          Aggiungi prodotto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crea prodotto</DialogTitle>
          <DialogDescription>Crea un prodotto nuovo</DialogDescription>
        </DialogHeader>
        <CreateProductForm
          handleClose={() => setOpen(false)}
          domain={domain}
          siteId={siteId}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
