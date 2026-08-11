"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditTaskKanban from "@/components/kanbans/editKanbanTask";

type CalendarProjectEditDialogProps = {
  task: any;
  open: boolean;
  onClose: () => void;
  domain: string;
};

export function CalendarProjectEditDialog({
  task,
  open,
  onClose,
  domain,
}: CalendarProjectEditDialogProps) {
  const handleClose = (_wasDeleted?: boolean) => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent className="flex h-[min(900px,90vh)] max-h-[90vh] w-[1440px] max-w-[min(1440px,95vw)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 shrink-0"
              onClick={() => handleClose()}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Torna al calendario
            </Button>
            <DialogTitle className="text-left">
              Modifica {task?.unique_code || "progetto"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
        {task && (
          <EditTaskKanban
            handleClose={handleClose}
            resource={task}
            history={[]}
            open={open}
            setIsLocked={() => {}}
            setOpenModal={onClose}
            setOpen={onClose}
            domain={domain}
          />
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
