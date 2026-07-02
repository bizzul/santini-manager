/**
 * Server-only reader for the per-site language.
 *
 * Lives in a dedicated `.ts` file that imports `@/utils/supabase/server`
 * (which relies on `next/headers`) so it must never be bundled into a
 * client component. The client-safe constants + parser live in
 * `lib/i18n/config.ts`, and the translation engine in `lib/i18n/index.ts`.
 *
 * `getSiteLocale` is wrapped with `React.cache()` so a single request that
 * reads the locale from both the site layout and a page component only
 * triggers one Supabase round-trip.
 */
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_LOCALE,
  resolveSiteLocale,
  SITE_LANGUAGE_SETTING_KEY,
  type AppLocale,
} from "./config";
import { createTranslator, type Translator } from "./index";

export const getSiteLocale = cache(
  async (siteId: string): Promise<AppLocale> => {
    if (!siteId) return DEFAULT_LOCALE;

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("site_id", siteId)
        .eq("setting_key", SITE_LANGUAGE_SETTING_KEY)
        .maybeSingle();

      return resolveSiteLocale(data?.setting_value);
    } catch (error) {
      // Never break a page render if the settings table is unreachable.
      console.error(
        "[i18n] failed to read",
        SITE_LANGUAGE_SETTING_KEY,
        error,
      );
      return DEFAULT_LOCALE;
    }
  },
);

/** Convenience: build a translator bound to a locale (server components). */
export function getT(locale: AppLocale): Translator {
  return createTranslator(locale);
}

/** Convenience: resolve the locale for a site and return a bound translator. */
export async function getServerT(siteId: string): Promise<{
  locale: AppLocale;
  t: Translator;
}> {
  const locale = await getSiteLocale(siteId);
  return { locale, t: createTranslator(locale) };
}
