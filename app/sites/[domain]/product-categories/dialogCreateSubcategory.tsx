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
import CreateSubcategoryForm from "./createSubcategoryForm";

interface DialogCreateSubcategoryProps {
  domain: string;
  categoryId: number;
  categoryName: string;
  canManageImages?: boolean;
}

function DialogCreateSubcategory({
  domain,
  categoryId,
  categoryName,
  canManageImages = false,
}: DialogCreateSubcategoryProps) {
  const [isOpen, setOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Aggiungi sottocategoria</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90%] overflow-scroll sm:max-w-[40%]">
        <DialogHeader>
          <DialogTitle>Crea sottocategoria</DialogTitle>
          <DialogDescription>
            Crea una nuova sottocategoria per {categoryName}
          </DialogDescription>
        </DialogHeader>
        <CreateSubcategoryForm
          domain={domain}
          categoryId={categoryId}
          categoryName={categoryName}
          canManageImages={canManageImages}
          handleClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreateSubcategory;
