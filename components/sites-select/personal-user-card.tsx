"use client";

import Link from "next/link";
import { AlertTriangle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  PersonalManagerUser,
  UtenteGenere,
} from "@/lib/personal-manager/types";

/**
 * Card quadrata per un utente con Manager Personale abilitato.
 * La forma (aspect-square) e il colore per genere sono il segnale primario
 * che questa entita' NON e' uno spazio. Toni tenui, scelti per la
 * scansione visiva del pannello admin dark.
 */
const GENERE_CARD_CLASSES: Record<UtenteGenere, string> = {
  maschio: "bg-sky-500/15 border-sky-400/40",
  femmina: "bg-pink-500/15 border-pink-400/40",
  altro: "bg-slate-500/15 border-slate-400/40",
  non_specificato: "bg-slate-500/15 border-slate-400/40",
};

function displayName(user: PersonalManagerUser): string {
  const full = [user.givenName, user.familyName].filter(Boolean).join(" ");
  return full || user.email;
}

function computedInitials(user: PersonalManagerUser): string {
  if (user.initials) return user.initials;
  const parts = [user.givenName, user.familyName].filter(
    (p): p is string => Boolean(p),
  );
  if (parts.length > 0) {
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }
  return user.email.charAt(0).toUpperCase();
}

export function PersonalUserCard({
  user,
  isCurrentUser,
}: {
  user: PersonalManagerUser;
  isCurrentUser: boolean;
}) {
  // Le route admin degli utenti usano l'auth id (uuid), non la PK integer.
  const cta = isCurrentUser
    ? { href: "/personale", label: "Apri vista personale" }
    : {
        href: user.authId
          ? `/administration/users/${user.authId}`
          : "/administration/users",
        label: "Scheda utente",
      };

  return (
    <div
      className={`relative flex aspect-square flex-col items-center justify-between rounded-2xl border p-5 text-center transition-all duration-200 hover:brightness-110 ${GENERE_CARD_CLASSES[user.genere]}`}
    >
      {user.genere === "non_specificato" && (
        <span
          title="Genere non impostato"
          className="absolute right-3 top-3 text-white/50"
        >
          <AlertTriangle className="h-4 w-4" strokeWidth={2} />
        </span>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName(user)}
            className="h-14 w-14 rounded-full object-cover ring-1 ring-white/20"
            loading="lazy"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            {computedInitials(user) ? (
              <span className="text-lg font-semibold text-white">
                {computedInitials(user)}
              </span>
            ) : (
              <UserRound className="h-7 w-7 text-white" strokeWidth={2} />
            )}
          </div>
        )}

        <h3 className="max-w-full truncate text-base font-semibold text-white">
          {displayName(user)}
        </h3>
        <p className="max-w-full truncate text-xs text-white/60">{user.email}</p>

        <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
          Manager Personale
        </span>
      </div>

      <Link href={cta.href} className="mt-3 block w-full">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-white/25 text-white hover:border-white/40 hover:bg-white/10"
        >
          {cta.label}
        </Button>
      </Link>
    </div>
  );
}
