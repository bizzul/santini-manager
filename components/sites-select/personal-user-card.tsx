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
      className={`relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all duration-200 hover:brightness-110 ${GENERE_CARD_CLASSES[user.genere]}`}
    >
      {user.genere === "non_specificato" && (
        <span
          title="Genere non impostato"
          className="absolute right-2 top-2 text-white/50"
        >
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      )}

      <div className="flex w-full flex-col items-center gap-1.5">
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName(user)}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            {computedInitials(user) ? (
              <span className="text-sm font-semibold text-white">
                {computedInitials(user)}
              </span>
            ) : (
              <UserRound className="h-5 w-5 text-white" strokeWidth={2} />
            )}
          </div>
        )}

        <h3 className="line-clamp-2 w-full text-sm font-semibold leading-snug text-white">
          {displayName(user)}
        </h3>
        <p className="line-clamp-2 w-full text-[11px] leading-relaxed text-white/60">
          {user.email}
        </p>

        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80">
          Manager Personale
        </span>
      </div>

      <Link href={cta.href} className="mt-2.5 block w-full">
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
