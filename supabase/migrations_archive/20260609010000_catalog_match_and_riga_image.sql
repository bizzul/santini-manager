-- Catalogo: unita' e prezzo listino per match documenti
ALTER TABLE public."SellProduct"
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS list_price numeric;

COMMENT ON COLUMN public."SellProduct".unit IS 'Unita di misura catalogo (m1, Pz., h, mq, ml, kg, forfait)';
COMMENT ON COLUMN public."SellProduct".list_price IS 'Prezzo di listino per generatore documenti';

-- Immagine riga documento
ALTER TABLE public.righe_documento
  ADD COLUMN IF NOT EXISTS immagine_url text;

COMMENT ON COLUMN public.righe_documento.immagine_url IS 'URL immagine prodotto importata dal catalogo';

-- Ricerca fuzzy articoli (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE INDEX IF NOT EXISTS sellproduct_name_trgm_idx
  ON public."SellProduct" USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sellproduct_description_trgm_idx
  ON public."SellProduct" USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sellproduct_internal_code_idx
  ON public."SellProduct" (site_id, internal_code)
  WHERE internal_code IS NOT NULL;

-- RPC cerca_articolo: match per sito con scoring
CREATE OR REPLACE FUNCTION public.cerca_articolo(p_site_id uuid, p_query text)
RETURNS TABLE(
  id integer,
  codice text,
  descrizione text,
  unit text,
  list_price numeric,
  image_url text,
  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id,
    sp.internal_code AS codice,
    COALESCE(NULLIF(TRIM(sp.description), ''), sp.name) AS descrizione,
    sp.unit,
    sp.list_price,
    sp.image_url,
    GREATEST(
      CASE
        WHEN sp.internal_code IS NOT NULL
          AND lower(trim(sp.internal_code)) = lower(trim(p_query))
        THEN 1.0::real
        ELSE 0::real
      END,
      similarity(
        COALESCE(sp.name, '') || ' ' || COALESCE(sp.description, ''),
        p_query
      )
    ) AS score
  FROM public."SellProduct" sp
  WHERE sp.site_id = p_site_id
    AND (sp.active IS NULL OR sp.active IS TRUE)
    AND (
      (sp.internal_code IS NOT NULL AND sp.internal_code ILIKE '%' || p_query || '%')
      OR (COALESCE(sp.name, '') || ' ' || COALESCE(sp.description, '')) % p_query
      OR similarity(
        COALESCE(sp.name, '') || ' ' || COALESCE(sp.description, ''),
        p_query
      ) >= 0.2
    )
  ORDER BY score DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.cerca_articolo(uuid, text) TO authenticated, service_role;
