/**
 * Shared client-safe types for the i18n layer.
 */

/** Recursively makes every property optional (used for partial locale catalogs). */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Recursively makes every property optional AND widens string literal leaves
 * to `string`. The canonical Italian catalog is declared `as const`, so its
 * leaves are string literals (e.g. `"Salva"`). Other locale catalogs must be
 * able to hold any string for those keys, hence the widening.
 */
export type DeepPartialWiden<T> = {
  [K in keyof T]?: T[K] extends string
    ? string
    : T[K] extends object
      ? DeepPartialWiden<T[K]>
      : T[K];
};
