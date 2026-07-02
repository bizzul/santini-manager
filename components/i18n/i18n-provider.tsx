"use client";

import React, { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n";

interface I18nContextValue {
  locale: AppLocale;
  t: Translator;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: createTranslator(DEFAULT_LOCALE),
});

/**
 * Provides the current site locale + a bound translator to the client
 * subtree. The `locale` is resolved on the server (per-site setting) and
 * passed down from the site layout, so the very first client render already
 * matches the correct language (no flash of the default locale).
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: createTranslator(locale) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/** Returns the bound translator for the current site locale. */
export function useT(): Translator {
  return useContext(I18nContext).t;
}

/** Returns the current site locale. */
export function useLocale(): AppLocale {
  return useContext(I18nContext).locale;
}
