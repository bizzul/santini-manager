/**
 * Helper client-safe per il nome visualizzato dell'utente.
 * Non importare da auth-utils nei Client Component (porta next/headers).
 */

type UserLike = {
  email?: string | null;
  user_metadata?: {
    full_name?: string | null;
    name?: string | null;
    last_name?: string | null;
    given_name?: string | null;
    family_name?: string | null;
  } | null;
} | null;

export function getUserDisplayName(
  userContext: { user?: UserLike } | null | undefined
): string {
  const meta = userContext?.user?.user_metadata;
  if (meta?.full_name) return String(meta.full_name);
  if (meta?.name && meta?.last_name) {
    return `${meta.name} ${meta.last_name}`;
  }
  if (meta?.given_name || meta?.family_name) {
    return [meta?.given_name, meta?.family_name].filter(Boolean).join(" ");
  }
  return userContext?.user?.email ? String(userContext.user.email) : "";
}
