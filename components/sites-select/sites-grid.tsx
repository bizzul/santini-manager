import { getUserSites } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sites.map((site: any) => (
        <div
          key={site.id}
          className="group backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-white/60"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {site.image ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 group-hover:bg-white/20 transition-all shrink-0">
                  <Image
                    src={site.image}
                    alt={site.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all">
                  <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-white transition-all">
                  {site.name}
                </h3>
                {site.subdomain && (
                  <span className="text-sm text-white/60 group-hover:text-white/80">
                    {site.subdomain}
                  </span>
                )}
              </div>
            </div>
          </div>

          {site.description && (
            <p className="text-white/70 group-hover:text-white/90 text-sm mb-4 transition-all">
              {site.description}
            </p>
          )}

          <Link href={`/sites/${site.subdomain}/dashboard`}>
            <Button
              variant="outline"
              className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 font-semibold"
            >
              Entra nel tuo spazio →
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

export function SitesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-32 bg-white/20 rounded animate-pulse" />
              <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-full bg-white/20 rounded animate-pulse mb-4" />
          <div className="h-10 w-full bg-white/20 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

