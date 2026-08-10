import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CoefficienteCategoria,
  ListinoIncrementoDimensionale,
  Supplemento,
} from "@/types/supabase";
import type {
  ListinoDataSource,
  ProdottoListino,
} from "@/lib/listino/calcola-prezzo";

/**
 * Implementazione Supabase di {@link ListinoDataSource}, scoping-ata per site_id.
 * Le RLS garantiscono l'isolamento multi-tenant; il filtro esplicito su site_id
 * evita match cross-site quando si usa la service role.
 */
export function createSupabaseListinoDataSource(
  supabase: SupabaseClient,
  siteId: string,
): ListinoDataSource {
  return {
    async getProdotto(ref): Promise<ProdottoListino | null> {
      let query = supabase
        .from("SellProduct")
        .select(
          "id, modalita_prezzo, famiglia_apertura_cod, cod_materiale, cod_vetro_telaio, cod_tipo_cassone",
        )
        .eq("site_id", siteId)
        .limit(1);

      if (ref.sellProductId != null) {
        query = query.eq("id", ref.sellProductId);
      } else if (ref.internalCode) {
        query = query.eq("internal_code", ref.internalCode);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error("getProdotto error:", error);
        return null;
      }
      return (data as ProdottoListino | null) ?? null;
    },

    async getPrezzoGriglia(famigliaAperturaCod, larghezzaMm, altezzaMm) {
      const { data, error } = await supabase
        .from("listino_griglia_base")
        .select("prezzo_base_chf")
        .eq("site_id", siteId)
        .eq("famiglia_apertura_cod", famigliaAperturaCod)
        .eq("attivo", true)
        .lte("larghezza_min_mm", larghezzaMm)
        .gte("larghezza_max_mm", larghezzaMm)
        .lte("altezza_min_mm", altezzaMm)
        .gte("altezza_max_mm", altezzaMm)
        .order("prezzo_base_chf", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("getPrezzoGriglia error:", error);
        return null;
      }
      return data ? Number(data.prezzo_base_chf) : null;
    },

    async getPrezzoMisuraStandard(sellProductId, larghezzaMm, altezzaMm) {
      const { data, error } = await supabase
        .from("listino_misure_standard")
        .select("prezzo_chf")
        .eq("site_id", siteId)
        .eq("sell_product_id", sellProductId)
        .eq("larghezza_mm", larghezzaMm)
        .eq("altezza_mm", altezzaMm)
        .eq("attivo", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("getPrezzoMisuraStandard error:", error);
        return null;
      }
      return data ? Number(data.prezzo_chf) : null;
    },

    async getPrezzoFisso(sellProductId) {
      const { data, error } = await supabase
        .from("listino_fisso")
        .select("prezzo_chf")
        .eq("site_id", siteId)
        .eq("sell_product_id", sellProductId)
        .eq("attivo", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("getPrezzoFisso error:", error);
        return null;
      }
      return data ? Number(data.prezzo_chf) : null;
    },

    async getCoefficiente(categorie: CoefficienteCategoria[], codice: string) {
      const { data, error } = await supabase
        .from("listino_coefficienti")
        .select("moltiplicatore")
        .eq("site_id", siteId)
        .in("categoria", categorie)
        .eq("codice", codice)
        .eq("attivo", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("getCoefficiente error:", error);
        return null;
      }
      return data ? Number(data.moltiplicatore) : null;
    },

    async getIncrementiDimensionali(
      famigliaProdottoCod: string,
    ): Promise<ListinoIncrementoDimensionale[]> {
      const { data, error } = await supabase
        .from("listino_incrementi_dimensionali")
        .select("*")
        .eq("site_id", siteId)
        .eq("famiglia_prodotto_cod", famigliaProdottoCod)
        .eq("attivo", true);

      if (error) {
        console.error("getIncrementiDimensionali error:", error);
        return [];
      }
      return (data as ListinoIncrementoDimensionale[]) ?? [];
    },

    async getSupplementi(ids: string[]): Promise<Supplemento[]> {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("supplementi")
        .select("*")
        .eq("site_id", siteId)
        .in("id", ids);

      if (error) {
        console.error("getSupplementi error:", error);
        return [];
      }
      return (data as Supplemento[]) ?? [];
    },
  };
}
