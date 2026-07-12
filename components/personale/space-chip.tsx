import Link from "next/link";
import { Building2 } from "lucide-react";
import type { AccessibleSite } from "@/lib/personale/aggregate";

/**
 * Chip di provenienza: dichiara da quale spazio arriva la riga aggregata
 * e porta alla stessa entita' dentro il suo spazio nativo.
 */
export function SpaceChip({
  site,
  section,
}: {
  site: AccessibleSite | undefined;
  /** Sezione dello spazio nativo (es. "kanban", "inventory", "clients"). */
  section: string;
}) {
  if (!site) return null;

  return (
    <Link
      href={`/sites/${site.subdomain}/${section}`}
      className="inline-flex max-w-[160px] items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={`Apri in ${site.name}`}
    >
      {site.logo ? (
        <img
          src={site.logo}
          alt=""
          className="h-3.5 w-3.5 rounded-sm object-contain"
          loading="lazy"
        />
      ) : (
        <Building2 className="h-3 w-3" />
      )}
      <span className="truncate">{site.name}</span>
    </Link>
  );
}
