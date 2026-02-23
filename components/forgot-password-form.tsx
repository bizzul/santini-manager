"use client";

import { cn } from "@/lib/utils";
import { resetPasswordAction } from "@/app/(auth)/auth/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPasswordAction(email);
      if (result.error) throw new Error(result.error);
      setSuccess(true);
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
            {success ? "Email Inviata" : "Password Dimenticata"}
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
              Se l&apos;indirizzo email è registrato, riceverai un link per reimpostare la password.
            </p>
            <p className="text-white/60 text-xs">
              Controlla anche la cartella spam se non ricevi l&apos;email entro pochi minuti.
            </p>
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
        ) : (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <p className="text-white/80 text-sm text-center mb-4">
              Inserisci la tua email e ti invieremo un link per reimpostare la password.
            </p>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nome@esempio.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Invio in corso...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Invia Link di Reset
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
