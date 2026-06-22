"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { quickSignIn } from "./actions";
import type { QuickLoginUser } from "./data";

const GUIDE_PENDING_LOGIN_KEY = "santini-manager-guide-pending-login";

export function QuickLoginClient({
  domain,
  siteName,
  users,
  loadError,
}: {
  domain: string;
  siteName: string;
  users: QuickLoginUser[];
  loadError: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<QuickLoginUser | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openUser = (user: QuickLoginUser) => {
    setSelected(user);
    setPassword("");
    setError(null);
  };

  const closeDialog = () => {
    if (isPending) return;
    setSelected(null);
    setPassword("");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);

    try {
      window.sessionStorage.setItem(GUIDE_PENDING_LOGIN_KEY, "1");
    } catch {
      // Ignore storage errors: login should still work even without auto-guide.
    }

    startTransition(async () => {
      try {
        const result = await quickSignIn(domain, selected.id, password);
        if (result && "error" in result) {
          try {
            window.sessionStorage.removeItem(GUIDE_PENDING_LOGIN_KEY);
          } catch {
            // Ignore storage errors.
          }
          setError(result.error);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("NEXT_REDIRECT")) {
          throw err; // Re-throw to allow Next.js to handle the redirect
        }
        try {
          window.sessionStorage.removeItem(GUIDE_PENDING_LOGIN_KEY);
        } catch {
          // Ignore storage errors.
        }
        setError("Si è verificato un errore imprevisto.");
      }
    });
  };

  return (
    <div className="w-full px-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
          <Image
            src="/logo-bianco.svg"
            alt="Santini Manager Logo"
            width={72}
            height={72}
            className="drop-shadow-2xl"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-white">
            Accesso rapido
          </h1>
          <p className="text-center text-white/70">
            {siteName} · seleziona il tuo profilo per accedere
          </p>
        </div>

        {loadError ? (
          <div className="text-white text-sm text-center bg-red-500/20 border border-red-400/50 rounded-lg p-4 backdrop-blur-sm">
            Impossibile caricare gli utenti. Riprova più tardi.
          </div>
        ) : users.length === 0 ? (
          <div className="text-white/80 text-sm text-center bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm flex items-center gap-2 justify-center">
            <UserX className="w-4 h-4" />
            Nessun utente attivo disponibile.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => openUser(user)}
                disabled={isPending}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/5 p-4 transition-all duration-300 hover:bg-white/15 hover:border-white/40 hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Avatar className="h-16 w-16 shadow-lg">
                  <AvatarImage src={user.picture || undefined} />
                  <AvatarFallback
                    style={{ backgroundColor: user.color }}
                    className="text-white text-xl font-semibold"
                  >
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center gap-0.5 min-h-[2.5rem]">
                  <span className="text-sm font-semibold text-white text-center leading-tight">
                    {user.name}
                  </span>
                  {user.companyRole && (
                    <span className="text-xs text-white/60 text-center leading-tight">
                      {user.companyRole}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/80 group-hover:text-white">
                  <LogIn className="w-3.5 h-3.5" />
                  Login personale
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Accedi con email e password
          </Link>
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login personale</DialogTitle>
            <DialogDescription>
              Inserisci la tua password per accedere.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selected.picture || undefined} />
                  <AvatarFallback
                    style={{ backgroundColor: selected.color }}
                    className="text-white font-semibold"
                  >
                    {selected.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold">{selected.name}</span>
                  {selected.companyRole && (
                    <span className="text-sm text-muted-foreground">
                      {selected.companyRole}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="quick-password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="quick-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {error && (
                <div className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/40 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
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
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
