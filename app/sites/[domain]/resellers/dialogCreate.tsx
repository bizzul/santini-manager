"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ResellerForm, { ResellerFormValues } from "./resellerForm";
import { createItem } from "./actions/create-item.action";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/components/i18n/i18n-provider";

function DialogCreate({ domain }: { domain: string }) {
  const [isOpen, setOpen] = useState(false);
  const { toast } = useToast();
  const t = useT();
  const router = useRouter();

  const handleSubmit = async (values: ResellerFormValues) => {
    const result = await createItem(values, domain);
    if (result && "message" in result) {
      toast({
        variant: "destructive",
        description: result.message || t("resellers.createError"),
      });
      return;
    }
    toast({
      description: t("resellers.createdSuccess", { name: values.name }),
    });
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          {t("resellers.addReseller")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90%] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("resellers.createTitle")}</DialogTitle>
          <DialogDescription>{t("resellers.pageSubtitle")}</DialogDescription>
        </DialogHeader>
        <ResellerForm onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogCreate;
