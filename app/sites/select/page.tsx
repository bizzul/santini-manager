import { Suspense } from "react";
import Image from "next/image";
import {
  SelectTopBar,
  SelectTopBarSkeleton,
} from "@/components/sites-select/select-top-bar";
import {
  SitesGrid,
  SitesGridSkeleton,
} from "@/components/sites-select/sites-grid";

export default async function SelectSitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950" />

      {/* Top Bar */}
      <Suspense fallback={<SelectTopBarSkeleton />}>
        <SelectTopBar />
      </Suspense>

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
          <Suspense fallback={<SitesGridSkeleton />}>
            <SitesGrid />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
