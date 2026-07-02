/**
 * Client-safe i18n configuration for per-site language selection.
 *
 * The language is a property of the SITE (space), persisted in
 * `site_settings` under the `site_language` key with a JSONB value of the
 * shape `{ "locale": "it" | "de" }`. Italian is the default and the
 * canonical source of translation keys.
 *
 * IMPORTANT: keep this module free of any server-only import (no
 * `next/headers`, no `@/utils/supabase/server`) so it can be bundled into
 * client components (admin modal, provider, sidebar, ...).
 */

export const SUPPORTED_LOCALES = ["it", "de"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "it";

/** Key used to store/read the language in `site_settings`. */
export const SITE_LANGUAGE_SETTING_KEY = "site_language";

/** Human readable labels (in Italian) for the admin picker. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  it: "Italiano",
  de: "Tedesco",
};

/** Native labels, useful for a self-describing language switcher. */
export const LOCALE_NATIVE_LABELS: Record<AppLocale, string> = {
  it: "Italiano",
  de: "Deutsch",
};

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Coerces any persisted `site_settings.setting_value` into a strict
 * `AppLocale`. The JSONB column could hold a raw string (`"de"`), an object
 * (`{ locale: "de" }`) or `null`; this normalizer makes every caller
 * forward-compatible with any of those shapes and always falls back to the
 * default locale.
 */
export function resolveSiteLocale(value: unknown): AppLocale {
  if (!value) return DEFAULT_LOCALE;

  if (isAppLocale(value)) return value;

  if (typeof value === "object" && value !== null) {
    const locale = (value as { locale?: unknown }).locale;
    if (isAppLocale(locale)) return locale;
  }

  return DEFAULT_LOCALE;
}
