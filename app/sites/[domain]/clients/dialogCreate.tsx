"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateClientForm from "./createForm";
import { useT } from "@/components/i18n/i18n-provider";

function DialogCreate() {
  const [isOpen, setOpen] = useState(false);
  const router = useRouter();
  const t = useT();
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0 whitespace-nowrap">
          {t("clients.addClient")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90%] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("clients.createTitle")}</DialogTitle>
        </DialogHeader>
        <CreateClientForm
          handleClose={(success) => {
            setOpen(false);
            if (success) router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
