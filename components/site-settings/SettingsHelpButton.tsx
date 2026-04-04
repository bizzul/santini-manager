"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsHelpButtonProps {
  title: string;
  summary: string;
  details: readonly string[];
}

export default function SettingsHelpButton({
  title,
  summary,
  details,
}: SettingsHelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setOpen(true)}
            className="h-8 w-8 rounded-full border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Info className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-left">
          {summary}
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-white/70">
              {summary}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-white/80">
            {details.map((detail) => (
              <p
                key={detail}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                {detail}
              </p>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
