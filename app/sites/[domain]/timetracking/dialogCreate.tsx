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
import { Roles, Task, User } from "@/types/supabase";

export interface InternalActivity {
  id: string;
  code: string;
  label: string;
  site_id: string | null;
  sort_order: number;
}

function DialogCreate({
  data,
  users,
  roles,
  internalActivities,
}: {
  data: Task[];
  users: User[];
  roles: Roles[];
  internalActivities: InternalActivity[];
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild>
        <div className="container flex justify-end pt-12 overflow-hidden pointer-events-none ">
          <Button className="pointer-events-auto" onClick={() => setOpen(true)}>
            Aggiungi report ore
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Nuovo report ore</DialogTitle>
          <DialogDescription>Crea un nuovo report ore</DialogDescription>
        </DialogHeader>
        <CreateProductForm
          key={String(isOpen)}
          data={data}
          users={users}
          roles={roles}
          internalActivities={internalActivities}
          handleClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
