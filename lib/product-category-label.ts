/**
 * Helper centralizzati per gestire in modo uniforme la relazione
 * "category" su oggetti provenienti da Supabase.
 *
 * Supabase, a seconda del tipo di join utilizzato nella query, puo
 * restituire il valore della relazione come:
 *  - oggetto singolo
 *  - array di oggetti (join implicito)
 *  - null/undefined se la relazione non esiste
 *  - stringa gia normalizzata (casi legacy/import CSV)
 *
 * Usare questi helper evita bug intermittenti su KPI e grafici in cui
 * alcune categorie risultano "Senza categoria" solo perche la forma
 * della relazione e cambiata.
 */

type RelationLike<T> = T | T[] | null | undefined;

const DEFAULT_CATEGORY_LABEL = "Senza categoria";

export function normalizeSupabaseRelation<T>(
    value: RelationLike<T>,
): T | null {
    if (value == null) return null;
    if (Array.isArray(value)) {
        return value.length > 0 ? (value[0] ?? null) : null;
    }
    return value;
}

export interface CategoryShape {
    id?: string | number | null;
    name?: string | null;
    color?: string | null;
}

/**
 * Dato un oggetto che contiene una relazione `category` estrae la label
 * gestendo tutti i casi descritti sopra. Accetta anche override "string".
 */
export function getProductCategoryLabel(
    input:
        | {
            category?: RelationLike<CategoryShape> | string;
            SellProduct?: {
                category?: RelationLike<CategoryShape> | string;
            } | null;
            sell_products?: {
                category?: RelationLike<CategoryShape> | string;
            } | null;
        }
        | null
        | undefined,
    fallback: string = DEFAULT_CATEGORY_LABEL,
): string {
    if (!input) return fallback;

    const candidates: Array<RelationLike<CategoryShape> | string | undefined> =
        [
            input.category,
            input.SellProduct?.category,
            input.sell_products?.category,
        ];

    for (const candidate of candidates) {
        if (candidate == null) continue;
        if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (trimmed) return trimmed;
            continue;
        }
        const relation = normalizeSupabaseRelation(
            candidate as RelationLike<CategoryShape>,
        );
        if (relation?.name) {
            const trimmed = String(relation.name).trim();
            if (trimmed) return trimmed;
        }
    }

    return fallback;
}

/**
 * Stesso approccio ma restituisce anche un color (se disponibile).
 */
export function getProductCategoryLabelAndColor(
    input:
        | {
            category?: RelationLike<CategoryShape> | string;
            SellProduct?: {
                category?: RelationLike<CategoryShape> | string;
            } | null;
            sell_products?: {
                category?: RelationLike<CategoryShape> | string;
            } | null;
        }
        | null
        | undefined,
    fallback: string = DEFAULT_CATEGORY_LABEL,
): { label: string; color: string | null } {
    const label = getProductCategoryLabel(input, fallback);

    if (!input) return { label, color: null };

    const candidates: Array<RelationLike<CategoryShape>> = [
        input.category as RelationLike<CategoryShape>,
        input.SellProduct?.category as RelationLike<CategoryShape>,
        input.sell_products?.category as RelationLike<CategoryShape>,
    ];

    for (const candidate of candidates) {
        const relation = normalizeSupabaseRelation(candidate);
        if (relation?.color) {
            return { label, color: relation.color };
        }
    }

    return { label, color: null };
}
