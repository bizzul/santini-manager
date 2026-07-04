"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { removeItem } from "./actions/delete-item.action";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/components/i18n/i18n-provider";
import { Reseller } from "@/types/supabase";

function DialogDelete({
  isOpen,
  setOpen,
  data,
  domain,
}: {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  data: Reseller;
  domain: string;
}) {
  const { toast } = useToast();
  const t = useT();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await removeItem(data.id, domain);
      if (result && "message" in result) {
        toast({
          variant: "destructive",
          description: result.message || t("resellers.deleteError"),
        });
        return;
      }
      toast({ description: t("resellers.deletedSuccess") });
      setOpen(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("resellers.deleteConfirmTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("resellers.deleteConfirmDescription", { name: data.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DialogDelete;
