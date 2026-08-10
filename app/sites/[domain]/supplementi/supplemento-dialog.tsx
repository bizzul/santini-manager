"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Supplemento } from "@/types/supabase";
import { SupplementoForm } from "./supplemento-form";

type Props = {
  domain: string;
  siteId: string;
  supplemento?: Supplemento;
  trigger: React.ReactNode;
};

export function SupplementoDialog({
  domain,
  siteId,
  supplemento,
  trigger,
}: Props) {
  const [isOpen, setOpen] = useState(false);
  const isEdit = Boolean(supplemento);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica supplemento" : "Nuovo supplemento"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dati del supplemento."
              : "Crea un sovrapprezzo opzionale applicabile ai prodotti."}
          </DialogDescription>
        </DialogHeader>
        <SupplementoForm
          handleClose={() => setOpen(false)}
          domain={domain}
          siteId={siteId}
          supplemento={supplemento}
        />
      </DialogContent>
    </Dialog>
  );
}
