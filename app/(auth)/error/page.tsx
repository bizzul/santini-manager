import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="w-full px-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
          <Image
            src="/logo-bianco.svg"
            alt="Logo"
            width={80}
            height={80}
            className="drop-shadow-2xl"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">
            Si è verificato un errore
          </h1>
        </div>

        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-400/50 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {params?.error ? (
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/70 text-sm">
                <span className="text-white/50 text-xs">Codice errore: </span>
                {params.error}
              </p>
            </div>
          ) : (
            <p className="text-white/70 text-sm">
              Si è verificato un errore non specificato.
            </p>
          )}

          <Link href="/login">
            <Button
              variant="outline"
              className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna al Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
