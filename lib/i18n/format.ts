/**
 * Client-safe locale-aware formatting helpers.
 *
 * Maps the app locale to a concrete BCP-47 tag suitable for `Intl` APIs.
 * The business operates in Switzerland, so both locales use the Swiss
 * region by default.
 */
import { DEFAULT_LOCALE, type AppLocale } from "./config";

const INTL_LOCALE: Record<AppLocale, string> = {
  it: "it-CH",
  de: "de-CH",
};

export function toIntlLocale(locale: AppLocale): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE[DEFAULT_LOCALE];
}

export function formatDate(
  date: Date | string | number,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const value = date instanceof Date ? date : new Date(date);
  return value.toLocaleDateString(toIntlLocale(locale), options);
}

export function formatDateTime(
  date: Date | string | number,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const value = date instanceof Date ? date : new Date(date);
  return value.toLocaleString(toIntlLocale(locale), options);
}

export function formatNumber(
  value: number,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(toIntlLocale(locale), options);
}
