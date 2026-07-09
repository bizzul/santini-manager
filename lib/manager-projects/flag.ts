// Feature flag della nuova shell super-admin "Manager dei Manager".
// Env-based (vale per l'intera istanza) e combinato sempre con il check
// ruolo superadmin lato server. Documentato in docs/FEATURE-FLAGS.md.

export function isManagerOfManagersEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MANAGER_OF_MANAGERS === "true";
}
