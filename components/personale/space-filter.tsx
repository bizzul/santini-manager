"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessibleSite } from "@/lib/personale/aggregate";

/**
 * Filtro multi-select `Spazi`: tutti selezionati di default (nessun
 * parametro in URL). Deselezionando uno spazio, sparisce dall'aggregato.
 * Stato nel parametro `?spazi=sub1,sub2` cosi' e' condivisibile.
 */
export function SpaceFilter({ sites }: { sites: AccessibleSite[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const param = searchParams.get("spazi");
  const selected = new Set(
    param
      ? param.split(",").map((s) => s.trim()).filter(Boolean)
      : sites.map((s) => s.subdomain),
  );

  const toggle = (subdomain: string) => {
    const next = new Set(selected);
    if (next.has(subdomain)) {
      next.delete(subdomain);
    } else {
      next.add(subdomain);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next.size === sites.length) {
      params.delete("spazi");
    } else {
      params.set("spazi", Array.from(next).join(","));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  if (sites.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        Spazi
      </span>
      {sites.map((site) => {
        const active = selected.has(site.subdomain);
        return (
          <button
            key={site.id}
            type="button"
            onClick={() => toggle(site.subdomain)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {active && <Check className="h-3 w-3" />}
            {site.name}
          </button>
        );
      })}
    </div>
  );
}
