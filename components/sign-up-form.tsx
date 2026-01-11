"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Le password non corrispondono");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      setIsLoading(false);
      return;
    }

    try {
      const baseUrl = window.location.origin;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseUrl}/auth/confirm?type=signup&next=/auth/sign-up-success`,
        },
      });
      if (error) throw error;
      router.push("/sign-up-success");
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
            Registrati
          </h1>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-white">
              Password
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
            <label htmlFor="repeat-password" className="text-sm font-medium text-white">
              Conferma Password
            </label>
            <Input
              id="repeat-password"
              type="password"
              placeholder="••••••••"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
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
                Creazione account...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Crea Account
              </div>
            )}
          </Button>

          <div className="mt-4 text-center">
            <span className="text-sm text-white/70">
              Hai già un account?{" "}
            </span>
            <Link
              href="/login"
              className="text-sm text-white hover:text-white/80 transition-colors underline underline-offset-4"
            >
              Accedi
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
