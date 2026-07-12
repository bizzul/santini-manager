/**
 * Preferenza di sessione "vista": una volta che l'utente sceglie
 * esplicitamente Personale o Spazi, il redirect automatico da mobile non
 * lo rispedisce piu' indietro. Cookie di sessione (niente maxAge).
 */
export const VISTA_COOKIE = "fdm-vista";

/** Ultimo spazio visitato (subdomain), per la landing "ultimo_spazio". */
export const LAST_SPACE_COOKIE = "fdm-last-space";

export type Vista = "personale" | "spazi";

export function isVista(value: string | undefined): value is Vista {
  return value === "personale" || value === "spazi";
}
