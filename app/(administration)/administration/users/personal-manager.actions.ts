"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { createServiceClient } from "@/utils/supabase/server";
import {
  isLandingPreferita,
  isUtenteGenere,
  type LandingPreferita,
  type UtenteGenere,
} from "@/lib/personal-manager/types";

export interface PersonalManagerState {
  abilitato: boolean;
  abilitatoAt: string | null;
  abilitatoDaNome: string | null;
  genere: UtenteGenere;
  landingPreferita: LandingPreferita;
}

/** Stato Manager Personale per la scheda utente (admin). */
export async function getPersonalManagerState(
  userAuthId: string,
): Promise<PersonalManagerState | null> {
  const context = await getUserContext();
  if (!context || !isAdminOrSuperadmin(context.role)) {
    throw new Error("Non autorizzato");
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("User")
    .select(
      "genere, landing_preferita, personal_manager_abilitato, personal_manager_abilitato_at, personal_manager_abilitato_da",
    )
    .eq("authId", userAuthId)
    .maybeSingle();
  if (error || !data) return null;

  let abilitatoDaNome: string | null = null;
  if (data.personal_manager_abilitato_da) {
    const { data: actor } = await service
      .from("User")
      .select("given_name, family_name, email")
      .eq("authId", String(data.personal_manager_abilitato_da))
      .maybeSingle();
    if (actor) {
      abilitatoDaNome =
        [actor.given_name, actor.family_name].filter(Boolean).join(" ") ||
        actor.email;
    }
  }

  return {
    abilitato: Boolean(data.personal_manager_abilitato),
    abilitatoAt: data.personal_manager_abilitato_at,
    abilitatoDaNome,
    genere:
      data.genere && isUtenteGenere(data.genere)
        ? data.genere
        : "non_specificato",
    landingPreferita:
      data.landing_preferita && isLandingPreferita(data.landing_preferita)
        ? data.landing_preferita
        : "auto",
  };
}

/**
 * Abilita/disabilita il Manager Personale su un utente.
 * SOLO superadmin: un utente non puo' auto-abilitarsi e un admin non puo'
 * cambiare il perimetro di aggregazione di un altro utente.
 *
 * All'attivazione: seed idempotente delle 8 aree standard (ripristina le
 * soft-deleted). Alla disattivazione: soft delete delle aree — mai hard
 * delete, cosi' la Wheel torna com'era se il toggle si riaccende.
 */
export async function setPersonalManagerEnabled(
  userAuthId: string,
  enabled: boolean,
): Promise<{ ok: true }> {
  const context = await getUserContext();
  if (!context || context.role !== "superadmin") {
    throw new Error("Solo un superadmin puo' modificare il Manager Personale");
  }
  const actorId = context.userId || context.user?.id;
  if (!actorId) throw new Error("Contesto utente non valido");

  const service = createServiceClient();
  const { error } = await service
    .from("User")
    .update({
      personal_manager_abilitato: enabled,
      // L'attore esplicito: il trigger DB lo usa per audit e timestamp.
      personal_manager_abilitato_da: actorId,
    })
    .eq("authId", userAuthId);
  if (error) throw new Error(error.message);

  if (enabled) {
    const { error: seedError } = await service.rpc("seed_aree_vita", {
      target_user_id: userAuthId,
    });
    if (seedError) throw new Error(seedError.message);
  } else {
    const { error: softDeleteError } = await service
      .from("aree_vita")
      .update({ deleted_at: new Date().toISOString() })
      .eq("utente_id", userAuthId)
      .is("deleted_at", null);
    if (softDeleteError) throw new Error(softDeleteError.message);
  }

  revalidatePath("/administration/users");
  revalidatePath(`/administration/users/${userAuthId}`);
  revalidatePath("/sites/select");
  return { ok: true };
}

/** Genere e landing preferita (admin o superadmin). */
export async function updateUserPersonalSettings(
  userAuthId: string,
  settings: { genere: UtenteGenere; landingPreferita: LandingPreferita },
): Promise<{ ok: true }> {
  const context = await getUserContext();
  if (!context || !isAdminOrSuperadmin(context.role)) {
    throw new Error("Non autorizzato");
  }
  if (
    !isUtenteGenere(settings.genere) ||
    !isLandingPreferita(settings.landingPreferita)
  ) {
    throw new Error("Valori non validi");
  }

  const service = createServiceClient();
  const { error } = await service
    .from("User")
    .update({
      genere: settings.genere,
      landing_preferita: settings.landingPreferita,
    })
    .eq("authId", userAuthId);
  if (error) throw new Error(error.message);

  revalidatePath("/administration/users");
  revalidatePath(`/administration/users/${userAuthId}`);
  revalidatePath("/sites/select");
  return { ok: true };
}
