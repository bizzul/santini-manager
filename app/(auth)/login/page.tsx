"use client";

import { signIn, signup } from "./actions";
import { Suspense, useState, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { LogIn, UserX } from "lucide-react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deactivatedMessage, setDeactivatedMessage] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("deactivated") === "true") {
      setDeactivatedMessage(true);
      // Remove the param from URL without refresh
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await signIn(formData);
        if (result && "error" in result) {
          setError(result.error);
        }
      } catch (err) {
        // Ignore redirect errors - they're used for navigation in Next.js
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("NEXT_REDIRECT")) {
          throw err; // Re-throw to allow Next.js to handle the redirect
        }
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      }
    });
  };

  return (
    <div className="w-full px-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={80}
            height={80}
            className="drop-shadow-2xl"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-white">
            Bentornati
          </h1>
        </div>

        <Suspense
          fallback={
            <div className="my-2 h-10 w-full rounded-md border border-white/20 bg-white/10 backdrop-blur-sm" />
          }
        >
          <form className="flex flex-col gap-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-white"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nome@esempio.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-white"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
              />
            </div>

            <Link
              href="/auth/forgot-password"
              className="text-sm text-white/70 hover:text-white transition-colors text-right"
            >
              Password dimenticata?
            </Link>

            {deactivatedMessage && (
              <div className="text-white text-sm text-center bg-amber-500/20 border border-amber-400/50 rounded-lg p-3 backdrop-blur-sm flex items-center gap-2 justify-center">
                <UserX className="w-4 h-4" />
                Il tuo account è stato disattivato. Contatta l'amministratore.
              </div>
            )}

            {error && (
              <div className="text-white text-sm text-center bg-red-500/20 border border-red-400/50 rounded-lg p-3 backdrop-blur-sm">
                {error}
              </div>
            )}

            <Button
              size="lg"
              variant="outline"
              className="mt-4 w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 text-lg py-6 font-semibold"
              formAction={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Accesso in corso...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Accedi
                </div>
              )}
            </Button>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                ← Torna alla home
              </Link>
            </div>
          </form>
        </Suspense>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full px-4">
        <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
