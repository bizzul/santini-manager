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
import SiteThemeColorsConfigurator from "@/components/site-settings/SiteThemeColorsConfigurator";
import type { SiteThemeSettings } from "@/lib/site-theme";

interface SiteThemeSettingsModalProps {
  siteId: string;
  initialSettings: SiteThemeSettings;
  trigger: React.ReactNode;
}

export default function SiteThemeSettingsModal({
  siteId,
  initialSettings,
  trigger,
}: SiteThemeSettingsModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>Colori e modalita</DialogTitle>
          <DialogDescription>
            Configura colori menu, schermate e modalita tema per questo sito.
          </DialogDescription>
        </DialogHeader>
        <SiteThemeColorsConfigurator
          siteId={siteId}
          initialSettings={initialSettings}
        />
      </DialogContent>
    </Dialog>
  );
}
