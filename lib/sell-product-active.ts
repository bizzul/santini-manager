// Helpers per distinguere prodotti/categorie archiviati nei selettori di
// creazione (nuovi progetti/offerte). Gli archiviati restano consultabili nei
// record storici, ma non devono comparire nei picker di nuova creazione.

/**
 * True se la categoria e' una categoria di archivio (convenzione: nome che
 * inizia con "Archivio", es. "Archivio 2026").
 */
export function isArchivedSellCategoryName(name?: string | null): boolean {
  return /^\s*archivio\b/i.test(name || "");
}

/**
 * True se il prodotto e' selezionabile in un picker di nuova creazione.
 * Esclude i prodotti disattivati (ATTIVO = NO).
 */
export function isSelectableSellProduct(product: {
  active?: boolean | null;
}): boolean {
  return product.active !== false;
}
