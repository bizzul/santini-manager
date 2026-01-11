"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { logger } from "@/lib/logger";
import { KeyRound, CheckCircle, ArrowLeft } from "lucide-react";

export function UpdatePasswordForm({
  className,
  token,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Le password non corrispondono");
      return;
    }

    if (password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (token) {
        // This is a password reset flow - we need to use the recovery token
        console.log("Attempting password recovery with token:", token);
        console.log("Token type:", typeof token);
        console.log("Token length:", token.length);

        try {
          // First, we need to exchange the recovery token for a session
          const { data, error: recoveryError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          });

          if (recoveryError) {
            logger.error("Recovery token verification failed:", recoveryError);
            logger.error("Error details:", recoveryError.message);
            logger.error("Error status:", recoveryError.status);
            throw new Error(
              "Il link di recupero non è valido o è scaduto. Richiedi un nuovo link."
            );
          }

          // Now that we have a session, update the password
          const { error } = await supabase.auth.updateUser({ password });

          if (error) {
            logger.error("Password update failed:", error);
            throw error;
          }

          setSuccess(true);
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        } catch (updateError) {
          logger.error("Password update error:", updateError);
          throw new Error(
            "Impossibile aggiornare la password. Il link potrebbe essere scaduto."
          );
        }
      } else {
        // This is a regular password update (user already authenticated)
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        router.push("/");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Si è verificato un errore");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
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
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-white">
            {success ? "Password Aggiornata" : "Nuova Password"}
          </h1>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <p className="text-white/80 text-sm">
              La tua password è stata aggiornata con successo!
            </p>
            <p className="text-white/60 text-xs">
              Verrai reindirizzato al login tra pochi secondi...
            </p>
          </div>
        ) : (
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <p className="text-white/80 text-sm text-center mb-4">
              Inserisci la tua nuova password.
            </p>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-white">
                Nuova Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-white">
                Conferma Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
              />
            </div>

            {error && (
              <div className="text-white text-sm text-center bg-red-500/20 border border-red-400/50 rounded-lg p-3 backdrop-blur-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              variant="outline"
              className="mt-4 w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 text-lg py-6 font-semibold"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Aggiornamento in corso...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  Aggiorna Password
                </div>
              )}
            </Button>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                ← Torna al Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
