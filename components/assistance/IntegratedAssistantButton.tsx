"use client";

import { MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

type AssistantId = "vera" | "mira" | "aura";

function resolveAssistantFromPathname(pathname?: string | null): AssistantId {
  if (!pathname) return "vera";

  if (
    pathname.includes("/factory") ||
    pathname.includes("/inventory") ||
    pathname.includes("/calendar") ||
    pathname.includes("/timetracking") ||
    pathname.includes("/qualityControl") ||
    pathname.includes("/boxing") ||
    pathname.includes("/dashboard/produzione") ||
    pathname.includes("/dashboard/avor")
  ) {
    return "mira";
  }

  if (
    pathname.includes("/clients") ||
    pathname.includes("/offerte") ||
    pathname.includes("/dashboard/vendita") ||
    pathname.includes("/dashboard/forecast") ||
    pathname.includes("/suppliers") ||
    pathname.includes("/manufacturers")
  ) {
    return "aura";
  }

  return "vera";
}

export function IntegratedAssistantButton() {
  const pathname = usePathname();
  const assistant = resolveAssistantFromPathname(pathname);
  const assistantLabel =
    assistant === "mira" ? "Mira" : assistant === "aura" ? "Aura" : "Vera";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={`Apri ${assistantLabel}`}
      aria-label={`Apri ${assistantLabel}`}
      className="group fixed right-5 top-[84px] z-[70] h-11 w-auto gap-2 rounded-full border-white/20 bg-slate-900/85 px-2 text-white shadow-[0_0_0_1px_rgba(148,163,184,0.25),0_12px_28px_rgba(15,23,42,0.55)] transition-all duration-300 hover:scale-[1.03] hover:bg-slate-800"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("open-support-assistant", {
            detail: { assistant },
          })
        );
      }}
    >
      <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full border border-white/30 ring-2 ring-violet-300/30">
        <img
          src={`/api/assistant/avatar?assistant=${assistant}&variant=launcher`}
          alt={`${assistantLabel} assistant avatar`}
          className="h-full w-full scale-150 object-cover object-[center_22%] transition-transform duration-500 group-hover:scale-[1.6]"
        />
      </span>
      <MessageCircleMore className="h-4 w-4 text-violet-100/90 transition-colors duration-300 group-hover:text-violet-50" />
    </Button>
  );
}
