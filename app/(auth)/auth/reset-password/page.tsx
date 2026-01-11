import { UpdatePasswordForm } from "@/components/update-password-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; token?: string; type?: string }>;
}) {
  const { token_hash, token, type } = await searchParams;

  // Debug: log what we received
  logger.debug("Reset password params:", { token_hash, token, type });

  // Supabase sends either token_hash or token, handle both cases
  const actualToken = token_hash || token;

  if (!actualToken || !type) {
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
              Link Non Valido
            </h1>
          </div>

          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <p className="text-white/80 text-sm">
              Il link per reimpostare la password non è valido o è scaduto.
            </p>
            <Link href="/auth/forgot-password">
              <Button
                variant="outline"
                className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Richiedi Nuovo Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show password update form - the client component will handle token verification
  return (
    <div className="w-full px-4">
      <UpdatePasswordForm token={actualToken} />
    </div>
  );
}
