"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ResellerForm, { ResellerFormValues } from "./resellerForm";
import { editItem } from "./actions/edit-item.action";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/components/i18n/i18n-provider";
import { Reseller } from "@/types/supabase";

function DialogEdit({
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

  const handleSubmit = async (values: ResellerFormValues) => {
    const result = await editItem(values, data.id, domain);
    if (result && "message" in result) {
      toast({
        variant: "destructive",
        description: result.message || t("resellers.updateError"),
      });
      return;
    }
    toast({
      description: t("resellers.updatedSuccess", { name: values.name }),
    });
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90%] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("resellers.editTitle")}</DialogTitle>
          <DialogDescription>{data.name}</DialogDescription>
        </DialogHeader>
        <ResellerForm initialData={data} onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogEdit;
