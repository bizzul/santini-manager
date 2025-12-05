import { getUserContext, getUserSites } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Building2, Home, Settings, LogOut } from "lucide-react";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function SelectSitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Fetch the sites the current user has access to
  const sites = await getUserSites();

  const userContext = await getUserContext();
  const userRole = userContext?.role;

  const params = await searchParams;
  const error = params.error;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950" />

      {/* Top Bar */}
      <div className="relative z-20 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              {(userRole === "superadmin" || userRole === "admin") && (
                <Link href="/administration">
                  <Button
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 font-semibold"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Amministrazione
                  </Button>
                </Link>
              )}

              <Link href="/logout">
                <Button
                  variant="outline"
                  className="border-2 border-white/40 text-white hover:bg-red-500/30 hover:border-red-400 hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 font-semibold"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo and Header */}
        <div className="w-full max-w-5xl mb-8">
          <div className="flex flex-col items-center justify-center mb-8 space-y-6">
            <Image
              src="/logo-bianco.svg"
              alt="Full Data Manager Logo"
              width={80}
              height={80}
              className="drop-shadow-2xl"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-center text-white">
              I tuoi spazi
            </h1>
            <p className="text-white/70 text-center">
              Seleziona uno spazio per accedere alla dashboard
            </p>

            {/* Error Message */}
            {error === "no_access" && (
              <div className="backdrop-blur-xl bg-red-500/20 border-2 border-red-500/50 rounded-2xl p-4 max-w-md">
                <p className="text-white text-center text-sm">
                  ⚠️ Non hai accesso a questo spazio. Per favore contatta
                  l'amministratore per richiedere l'accesso.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sites Grid */}
        <div className="w-full max-w-5xl space-y-6">
          {sites?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sites.map((site: any) => (
                <div
                  key={site.id}
                  className="group backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-white/60"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all">
                        <Building2
                          className="w-6 h-6 text-white"
                          strokeWidth={2}
                        />
                      </div>
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

                  <Link
                    href={`/sites/${site.domain || site.subdomain || site.id}.${
                      process.env.NEXT_PUBLIC_ROOT_DOMAIN
                    }/dashboard`}
                  >
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
          ) : (
            <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 text-center">
              <p className="text-white/70 text-lg">
                Nessuno spazio assegnato al tuo account
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
