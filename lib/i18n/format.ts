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

/**
 * Importi in franchi, formato svizzero: "CHF 17'930.97".
 * Solo visualizzazione: non arrotonda ne' altera i valori usati nei calcoli.
 */
export function formatCHF(
  value: number | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE,
  options?: { decimals?: 0 | 2; withCurrency?: boolean },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const decimals = options?.decimals ?? 2;
  const number = value.toLocaleString(toIntlLocale(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // "5'000" e non "5000": raggruppamento anche sotto 10'000
    useGrouping: true,
  });
  return options?.withCurrency === false ? number : `CHF ${number}`;
}

/**
 * Importi compatti per KPI e card: "CHF 871k", "CHF 1.35 Mio".
 * Una sola convenzione per tutto il gestionale (prima convivevano
 * "1.3M", "198.15 K", "871k").
 */
export function formatCHFCompact(
  value: number | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE,
  options?: { withCurrency?: boolean },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const intl = toIntlLocale(locale);
  const fmt = (n: number, digits: number) =>
    n.toLocaleString(intl, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  let body: string;
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    body = `${fmt(millions, Math.abs(millions) < 10 ? 2 : 1)} Mio`;
  } else if (abs >= 1_000) {
    const thousands = value / 1_000;
    body = `${fmt(thousands, Math.abs(thousands) < 100 ? 1 : 0)}k`;
  } else {
    body = fmt(value, 0);
  }
  return options?.withCurrency === false ? body : `CHF ${body}`;
}
