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
import { useT } from "@/components/i18n/i18n-provider";

function DialogCreate() {
  const [isOpen, setOpen] = useState(false);
  const t = useT();
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0 whitespace-nowrap">
          {t("clients.addClient")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90%] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("clients.createTitle")}</DialogTitle>
          {/* <DialogDescription>Crea un cliente nuovo</DialogDescription> */}
        </DialogHeader>
        <CreateProductForm handleClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
