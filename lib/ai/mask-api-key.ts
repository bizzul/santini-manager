/**
 * Maschera una API key per la visualizzazione in UI.
 * Formato: sk-ant-...XXXX (mai la chiave completa).
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return "••••••••";
  }

  if (key.startsWith("sk-ant-")) {
    return `sk-ant-...${key.slice(-4)}`;
  }

  if (key.startsWith("sk-")) {
    return `sk-...${key.slice(-4)}`;
  }

  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
