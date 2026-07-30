-- Treemap: stato attuale sensori per albero (on-demand drawer)
-- SECURITY INVOKER (default): soggetta a RLS tm_*

BEGIN;

CREATE OR REPLACE FUNCTION public.tm_sensori_stato_attuale(p_albero_id uuid)
RETURNS TABLE (
  sensore_id          uuid,
  tipo                public.tm_tipo_sensore,
  etichetta           text,
  modello             text,
  unita_misura        text,
  valore_attuale      numeric,
  misurato_at         timestamptz,
  stato               public.tm_stato_salute,
  batteria_pct        numeric,
  intervallo_minuti   integer,
  ultimo_contatto_at  timestamptz,
  verde_min           numeric,
  verde_max           numeric,
  giallo_min          numeric,
  giallo_max          numeric,
  delta_24h           numeric,
  installato_at       timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH ultima AS (
    SELECT DISTINCT ON (l.sensore_id)
      l.sensore_id,
      l.valore,
      l.misurato_at
    FROM public.tm_letture l
    INNER JOIN public.tm_sensori s ON s.id = l.sensore_id
    WHERE s.albero_id = p_albero_id
      AND s.deleted_at IS NULL
    ORDER BY l.sensore_id, l.misurato_at DESC
  ),
  ref_24h AS (
    SELECT DISTINCT ON (l.sensore_id)
      l.sensore_id,
      l.valore AS valore_24h
    FROM public.tm_letture l
    INNER JOIN public.tm_sensori s ON s.id = l.sensore_id
    WHERE s.albero_id = p_albero_id
      AND s.deleted_at IS NULL
      AND l.misurato_at BETWEEN (now() - interval '25 hours')
                            AND (now() - interval '23 hours')
    ORDER BY
      l.sensore_id,
      abs(extract(epoch FROM (l.misurato_at - (now() - interval '24 hours'))))
  )
  SELECT
    s.id,
    s.tipo,
    s.etichetta,
    s.modello,
    s.unita_misura,
    u.valore,
    u.misurato_at,
    public.tm_stato_sensore(
      s.site_id, s.id, s.tipo, s.albero_id,
      s.intervallo_minuti, s.ultimo_contatto_at, s.attivo, u.valore
    ),
    s.batteria_pct,
    s.intervallo_minuti,
    s.ultimo_contatto_at,
    sg.verde_min,
    sg.verde_max,
    sg.giallo_min,
    sg.giallo_max,
    CASE
      WHEN u.valore IS NOT NULL AND r.valore_24h IS NOT NULL
        THEN u.valore - r.valore_24h
      ELSE NULL
    END,
    s.created_at
  FROM public.tm_sensori s
  LEFT JOIN ultima u ON u.sensore_id = s.id
  LEFT JOIN ref_24h r ON r.sensore_id = s.id
  LEFT JOIN LATERAL (
    SELECT so.verde_min, so.verde_max, so.giallo_min, so.giallo_max
    FROM public.tm_soglie so
    WHERE so.site_id = s.site_id
      AND so.tipo = s.tipo
      AND (so.albero_id = s.albero_id OR so.albero_id IS NULL)
    ORDER BY CASE WHEN so.albero_id IS NOT NULL THEN 0 ELSE 1 END
    LIMIT 1
  ) sg ON true
  WHERE s.albero_id = p_albero_id
    AND s.deleted_at IS NULL
  ORDER BY s.tipo, s.etichetta;
$$;

GRANT EXECUTE ON FUNCTION public.tm_sensori_stato_attuale(uuid) TO authenticated;

COMMIT;
