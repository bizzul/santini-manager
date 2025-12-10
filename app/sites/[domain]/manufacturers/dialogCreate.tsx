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
import CreateForm from "./createForm";
import { Manufacturer_category } from "@/types/supabase";

function DialogCreate({
  data,
  domain,
}: {
  data: Manufacturer_category[];
  domain: string;
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Aggiungi produttore</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Crea produttore</DialogTitle>
          <DialogDescription>Crea un nuovo produttore</DialogDescription>
        </DialogHeader>
        <CreateForm
          handleClose={() => setOpen(false)}
          data={data}
          domain={domain}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
