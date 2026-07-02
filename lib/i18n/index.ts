/**
 * Client-safe translation engine.
 *
 * `translate(locale, key, params)` resolves a dot-path key against the
 * locale catalog, falling back to the canonical Italian catalog for any
 * missing key (progressive-rollout friendly) and finally to the raw key if
 * nothing matches. Supports `{param}` interpolation.
 *
 * Do NOT add server-only imports here — this module is bundled into client
 * components via the i18n provider.
 */
import {
  DEFAULT_LOCALE,
  type AppLocale,
} from "./config";
import { itMessages } from "./messages/it";
import { deMessages } from "./messages/de";

type MessageTree = { [key: string]: string | MessageTree };

const DICTIONARIES: Record<AppLocale, MessageTree> = {
  it: itMessages as unknown as MessageTree,
  de: deMessages as unknown as MessageTree,
};

export type TranslationParams = Record<string, string | number>;

export type Translator = (key: string, params?: TranslationParams) => string;

function getByPath(tree: MessageTree, path: string): string | undefined {
  const segments = path.split(".");
  let current: string | MessageTree | undefined = tree;

  for (const segment of segments) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as MessageTree)[segment];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, token: string) => {
    const replacement = params[token];
    return replacement === undefined ? match : String(replacement);
  });
}

export function translate(
  locale: AppLocale,
  key: string,
  params?: TranslationParams,
): string {
  const primary = getByPath(DICTIONARIES[locale] ?? {}, key);
  const fallback =
    primary ?? getByPath(DICTIONARIES[DEFAULT_LOCALE], key) ?? key;
  return interpolate(fallback, params);
}

/** Builds a bound translator for a given locale. */
export function createTranslator(locale: AppLocale): Translator {
  return (key, params) => translate(locale, key, params);
}
