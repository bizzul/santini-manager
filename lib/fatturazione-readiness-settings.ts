/**
 * Per-site toggle for the Fatture OUT readiness traffic light.
 * Missing/absent value = enabled (feature on by default on every invoicing board).
 * Set site_settings.fatturazione_readiness_enabled = false to disable without rollback.
 */

export const FATTURAZIONE_READINESS_SETTING_KEY = "fatturazione_readiness_enabled";

export function parseFatturazioneReadinessEnabled(value: unknown): boolean {
  if (value === false) return false;
  if (value === true) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "false" || normalized === "0") return false;
    if (normalized === "true" || normalized === "1") return true;
  }
  if (value && typeof value === "object" && "enabled" in (value as object)) {
    return parseFatturazioneReadinessEnabled(
      (value as { enabled?: unknown }).enabled,
    );
  }
  return true;
}
