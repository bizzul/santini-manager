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
import type { ListinoCoefficiente } from "@/types/supabase";
import { CoefficienteForm } from "./coefficiente-form";

type Props = {
  domain: string;
  siteId: string;
  coefficiente?: ListinoCoefficiente;
  trigger: React.ReactNode;
};

export function CoefficienteDialog({
  domain,
  siteId,
  coefficiente,
  trigger,
}: Props) {
  const [isOpen, setOpen] = useState(false);
  const isEdit = Boolean(coefficiente);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica coefficiente" : "Nuovo coefficiente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna il moltiplicatore di materiale/vetro/telaio."
              : "Crea un moltiplicatore per materiale, vetro o telaio."}
          </DialogDescription>
        </DialogHeader>
        <CoefficienteForm
          handleClose={() => setOpen(false)}
          domain={domain}
          siteId={siteId}
          coefficiente={coefficiente}
        />
      </DialogContent>
    </Dialog>
  );
}
