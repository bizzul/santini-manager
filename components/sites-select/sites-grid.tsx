import { getUserSites } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2 } from "lucide-react";
import {
  ACTIVE_WORKSPACE_KEYS,
  CUSTOM_DEMO_KEYS,
} from "@/lib/site-settings-guides";

type SiteGroup = {
  key: "active" | "template" | "custom";
  title: string;
  description: string;
  sites: any[];
};

const normalizeSiteKey = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function resolveSiteGroup(site: any): SiteGroup["key"] {
  const normalizedValues = [
    normalizeSiteKey(site.subdomain),
    normalizeSiteKey(site.name),
  ];

  if (
    normalizedValues.some((value) =>
      ACTIVE_WORKSPACE_KEYS.some((key) => value.includes(key))
    )
  ) {
    return "active";
  }

  if (
    normalizedValues.some((value) =>
      CUSTOM_DEMO_KEYS.some((key) => value.includes(key))
    )
  ) {
    return "custom";
  }

  return "template";
}

function SiteCard({ site }: { site: any }) {
  const visual = site.logo || site.image;

  return (
    <div className="group rounded-2xl border border-white/20 bg-white/8 p-5 transition-all duration-300 hover:border-white/40 hover:bg-white/12">
      <div className="flex items-start gap-3">
        {visual ? (
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
            <img
              src={visual}
              alt={site.name}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <Building2 className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-white">{site.name}</h3>
          {site.subdomain && (
            <p className="text-sm text-white/55">{site.subdomain}</p>
          )}
        </div>
      </div>

      <p className="mt-4 min-h-[40px] text-sm text-white/70">
        {site.description || "Spazio disponibile per accesso e gestione operativa."}
      </p>

      <Link href={`/sites/${site.subdomain}/dashboard`} className="mt-4 block">
        <Button
          variant="outline"
          className="w-full border-white/25 text-white hover:bg-white/10 hover:border-white/40"
        >
          Entra nel tuo spazio
        </Button>
      </Link>
    </div>
  );
}

export async function SitesGrid() {
  const sites = await getUserSites();

  if (!sites?.length) {
    return (
      <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 text-center">
        <p className="text-white/70 text-lg">
          Nessuno spazio assegnato al tuo account
        </p>
      </div>
    );
  }

  const groupedSites: SiteGroup[] = [
    {
      key: "active",
      title: "Utenti attivi",
      description: "Spazi operativi principali con accesso diretto.",
      sites: [],
    },
    {
      key: "template",
      title: "Demo template",
      description: "Demo standard pronte per presentazione e test.",
      sites: [],
    },
    {
      key: "custom",
      title: "Demo custom",
      description: "Demo personalizzate su misura per casi specifici.",
      sites: [],
    },
  ];

  sites.forEach((site: any) => {
    const groupKey = resolveSiteGroup(site);
    const group = groupedSites.find((entry) => entry.key === groupKey);
    if (group) {
      group.sites.push(site);
    }
  });

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {groupedSites.map((group) => (
        <section
          key={group.key}
          className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl"
        >
          <div className="mb-4 border-b border-white/10 pb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60">
                {group.sites.length}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/55">{group.description}</p>
          </div>

          <div className="space-y-4">
            {group.sites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
                Nessuno spazio in questa sezione.
              </div>
            ) : (
              group.sites.map((site) => <SiteCard key={site.id} site={site} />)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SitesGridSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {[1, 2, 3].map((column) => (
        <div
          key={column}
          className="rounded-3xl border border-white/15 bg-white/5 p-4"
        >
          <div className="mb-4 space-y-2 border-b border-white/10 pb-4">
            <div className="h-6 w-32 animate-pulse rounded bg-white/15" />
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((card) => (
              <div
                key={card}
                className="rounded-2xl border border-white/15 bg-white/6 p-5"
              >
                <div className="flex gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-white/15" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded bg-white/15" />
                    <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
                <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
                <div className="mt-4 h-10 w-full animate-pulse rounded bg-white/15" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

