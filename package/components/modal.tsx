"use client";

import { FC } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children?: React.ReactNode;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOpenModal: any;
};

/**
 * @deprecated Use `@/components/ui/dialog` directly in new code.
 * This wrapper preserves the legacy API while rendering the canonical shadcn dialog.
 */
export const Modal: FC<Props> = ({
  children,
  open,
  setOpen,
  className,
  setOpenModal,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setOpenModal(null);
        }
      }}
    >
      <DialogContent
        className={`max-h-[90vh] max-w-7xl overflow-y-auto bg-card p-0 text-foreground ${className ?? ""}`}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};
