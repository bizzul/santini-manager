"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Boxes, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { setVistaPreference } from "@/lib/personale/vista-actions";

/**
 * Switcher `Personale ⇄ Spazi`, sempre visibile in header.
 * La scelta persiste in sessione: l'automatismo di landing indovina il caso
 * comune, lo switcher copre tutti gli altri.
 */
export function ViewSwitcher({
  current,
  lastSpaceHref,
}: {
  current: "personale" | "spazi";
  /** Destinazione per "Spazi": ultimo spazio visitato o il selettore. */
  lastSpaceHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const go = (vista: "personale" | "spazi") => {
    if (vista === current) return;
    startTransition(async () => {
      await setVistaPreference(vista);
      router.push(vista === "personale" ? "/personale" : lastSpaceHref);
    });
  };

  const itemClass = (active: boolean) =>
    cn(
      "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground",
      isPending && "opacity-60",
    );

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5">
      <button
        type="button"
        className={itemClass(current === "personale")}
        onClick={() => go("personale")}
        disabled={isPending}
      >
        <UserRound className="h-3.5 w-3.5" />
        Personale
      </button>
      <button
        type="button"
        className={itemClass(current === "spazi")}
        onClick={() => go("spazi")}
        disabled={isPending}
      >
        <Boxes className="h-3.5 w-3.5" />
        Spazi
      </button>
    </div>
  );
}
