"use client";

import { MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IntegratedAssistantButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title="Apri AssistBot"
      aria-label="Apri AssistBot"
      className="group h-11 w-auto gap-2 rounded-full border-white/20 bg-slate-900/85 px-2 text-white shadow-[0_0_0_1px_rgba(148,163,184,0.25),0_12px_28px_rgba(15,23,42,0.55)] transition-all duration-300 hover:scale-[1.03] hover:bg-slate-800"
      onClick={() => {
        window.dispatchEvent(new Event("open-support-assistant"));
      }}
    >
      <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full border border-white/30 ring-2 ring-violet-300/30">
        <img
          src="/api/assistant/vera-avatar?variant=launcher"
          alt="Vera assistant avatar"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </span>
      <MessageCircleMore className="h-4 w-4 text-violet-100/90 transition-colors duration-300 group-hover:text-violet-50" />
    </Button>
  );
}
