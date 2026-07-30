-- Treemap Benicchio: schema tm_* (alberi monitorati, sensori, letture, soglie)
-- Progetto: jzxffusiwtrvjwmpjztu (Full Data Manager)
-- RLS: pattern ev_* con user_can_access_site(site_id)

BEGIN;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.tm_tipo_sensore AS ENUM (
    'DENDROMETRO', 'SAP_FLOW', 'UMIDITA_SUOLO', 'UMIDITA_CHIOMA',
    'POTENZIALE_IDRICO', 'UMIDITA_FOGLIARE', 'PAR',
    'INCLINOMETRO', 'CONDUCIBILITA_LEGNO', 'MICROCLIMA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tm_stato_salute AS ENUM (
    'VERDE', 'GIALLO', 'ROSSO', 'OFFLINE', 'SCONOSCIUTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tm_stato_albero AS ENUM (
    'ATTIVO', 'IN_OSSERVAZIONE', 'RIMOSSO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- tm_alberi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tm_alberi (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  codice          text NOT NULL,
  specie_comune   text NOT NULL,
  specie_botanica text,
  latitude        numeric(9,6) NOT NULL,
  longitude       numeric(9,6) NOT NULL,
  indirizzo       text,
  comune          text NOT NULL,
  npa             text,
  altezza_m       numeric(4,1),
  diametro_tronco_cm numeric(5,1),
  anno_piantumazione integer,
  stato           public.tm_stato_albero NOT NULL DEFAULT 'ATTIVO',
  "clientId"      integer REFERENCES public."Client"(id) ON DELETE SET NULL,
  "taskId"        integer REFERENCES public."Task"(id) ON DELETE SET NULL,
  note            text,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tm_alberi_site_codice_unique UNIQUE (site_id, codice),
  CONSTRAINT tm_alberi_coords_ticino CHECK (
    latitude BETWEEN 45.80 AND 46.65
    AND longitude BETWEEN 8.35 AND 9.20
  )
);

CREATE INDEX IF NOT EXISTS idx_tm_alberi_site_active
  ON public.tm_alberi (site_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tm_alberi_site_comune
  ON public.tm_alberi (site_id, comune);
CREATE INDEX IF NOT EXISTS idx_tm_alberi_coords
  ON public.tm_alberi (latitude, longitude);

DROP TRIGGER IF EXISTS tm_alberi_set_updated_at ON public.tm_alberi;
CREATE TRIGGER tm_alberi_set_updated_at
  BEFORE UPDATE ON public.tm_alberi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tm_sensori
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tm_sensori (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                 uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  albero_id               uuid NOT NULL REFERENCES public.tm_alberi(id) ON DELETE CASCADE,
  tipo                    public.tm_tipo_sensore NOT NULL,
  etichetta               text,
  modello                 text,
  seriale                 text,
  unita_misura            text NOT NULL,
  intervallo_minuti       integer NOT NULL DEFAULT 60,
  profondita_cm           integer,
  altezza_installazione_cm integer,
  batteria_pct            numeric(5,2),
  ultimo_contatto_at      timestamptz,
  attivo                  boolean NOT NULL DEFAULT true,
  deleted_at              timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_sensori_site_seriale
  ON public.tm_sensori (site_id, seriale) WHERE seriale IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tm_sensori_albero_active
  ON public.tm_sensori (albero_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tm_sensori_site_tipo
  ON public.tm_sensori (site_id, tipo);

DROP TRIGGER IF EXISTS tm_sensori_set_updated_at ON public.tm_sensori;
CREATE TRIGGER tm_sensori_set_updated_at
  BEFORE UPDATE ON public.tm_sensori
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tm_letture (time-series)
-- Contratto ingest futuro (Edge Function, service_role):
--   POST { seriale, misurato_at, valore, qualita } — idempotente su (sensore_id, misurato_at)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tm_letture (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id      uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  sensore_id   uuid NOT NULL REFERENCES public.tm_sensori(id) ON DELETE CASCADE,
  misurato_at  timestamptz NOT NULL,
  valore       numeric(12,4) NOT NULL,
  qualita      smallint NOT NULL DEFAULT 100,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tm_letture_sensore_time_unique UNIQUE (sensore_id, misurato_at),
  CONSTRAINT tm_letture_qualita_range CHECK (qualita BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_tm_letture_sensore_time
  ON public.tm_letture (sensore_id, misurato_at DESC);

-- ---------------------------------------------------------------------------
-- tm_soglie
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tm_soglie (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id             uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  tipo                public.tm_tipo_sensore NOT NULL,
  albero_id           uuid REFERENCES public.tm_alberi(id) ON DELETE CASCADE,
  verde_min           numeric(12,4),
  verde_max           numeric(12,4),
  giallo_min          numeric(12,4),
  giallo_max          numeric(12,4),
  direzione_criticita text CHECK (direzione_criticita IN ('BASSO', 'ALTO', 'ENTRAMBI')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_soglie_site_tipo_albero
  ON public.tm_soglie (
    site_id, tipo, coalesce(albero_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

DROP TRIGGER IF EXISTS tm_soglie_set_updated_at ON public.tm_soglie;
CREATE TRIGGER tm_soglie_set_updated_at
  BEFORE UPDATE ON public.tm_soglie
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tm_calcola_stato — semaforo da soglia
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tm_calcola_stato(
  p_site_id   uuid,
  p_tipo      public.tm_tipo_sensore,
  p_valore    numeric,
  p_albero_id uuid DEFAULT NULL
) RETURNS public.tm_stato_salute
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN s.verde_min IS NOT NULL AND s.verde_max IS NOT NULL
         AND p_valore >= s.verde_min AND p_valore <= s.verde_max
      THEN 'VERDE'::public.tm_stato_salute
    WHEN s.giallo_min IS NOT NULL AND s.giallo_max IS NOT NULL
         AND p_valore >= s.giallo_min AND p_valore <= s.giallo_max
      THEN 'GIALLO'::public.tm_stato_salute
    ELSE 'ROSSO'::public.tm_stato_salute
  END
  FROM public.tm_soglie s
  WHERE s.site_id = p_site_id
    AND s.tipo = p_tipo
    AND (s.albero_id = p_albero_id OR (s.albero_id IS NULL AND p_albero_id IS NOT NULL) OR (s.albero_id IS NULL AND p_albero_id IS NULL))
  ORDER BY CASE WHEN s.albero_id IS NOT NULL THEN 0 ELSE 1 END
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Helper: stato singolo sensore (offline / sconosciuto / soglia)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tm_stato_sensore(
  p_site_id uuid,
  p_sensore_id uuid,
  p_tipo public.tm_tipo_sensore,
  p_albero_id uuid,
  p_intervallo_minuti integer,
  p_ultimo_contatto_at timestamptz,
  p_attivo boolean,
  p_valore numeric
) RETURNS public.tm_stato_salute
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT p_attivo THEN
    RETURN 'OFFLINE';
  END IF;
  IF p_ultimo_contatto_at IS NULL
     OR p_ultimo_contatto_at < (now() - (p_intervallo_minuti * 3 * interval '1 minute')) THEN
    RETURN 'OFFLINE';
  END IF;
  IF p_valore IS NULL THEN
    RETURN 'SCONOSCIUTO';
  END IF;
  RETURN public.tm_calcola_stato(p_site_id, p_tipo, p_valore, p_albero_id);
END;
$$;

-- Priorità peggior stato albero: ROSSO > OFFLINE > GIALLO > VERDE > SCONOSCIUTO
CREATE OR REPLACE FUNCTION public.tm_peggior_stato(
  p_stati public.tm_stato_salute[]
) RETURNS public.tm_stato_salute
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN 'ROSSO' = ANY(p_stati) THEN 'ROSSO'::public.tm_stato_salute
    WHEN 'OFFLINE' = ANY(p_stati) THEN 'OFFLINE'::public.tm_stato_salute
    WHEN 'GIALLO' = ANY(p_stati) THEN 'GIALLO'::public.tm_stato_salute
    WHEN 'VERDE' = ANY(p_stati) THEN 'VERDE'::public.tm_stato_salute
    ELSE 'SCONOSCIUTO'::public.tm_stato_salute
  END;
$$;

-- ---------------------------------------------------------------------------
-- Vista mappa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_tm_alberi_mappa AS
WITH ultima_lettura AS (
  SELECT DISTINCT ON (l.sensore_id)
    l.sensore_id,
    l.misurato_at,
    l.valore
  FROM public.tm_letture l
  ORDER BY l.sensore_id, l.misurato_at DESC
),
sensori_stato AS (
  SELECT
    s.id AS sensore_id,
    s.albero_id,
    s.site_id,
    s.tipo,
    s.attivo,
    s.intervallo_minuti,
    s.ultimo_contatto_at,
    ul.misurato_at AS ultima_lettura_at,
    ul.valore AS ultimo_valore,
    public.tm_stato_sensore(
      s.site_id, s.id, s.tipo, s.albero_id,
      s.intervallo_minuti, s.ultimo_contatto_at, s.attivo, ul.valore
    ) AS stato_sensore
  FROM public.tm_sensori s
  LEFT JOIN ultima_lettura ul ON ul.sensore_id = s.id
  WHERE s.deleted_at IS NULL
),
aggregati AS (
  SELECT
    ss.albero_id,
    ss.site_id,
    COUNT(*)::integer AS n_sensori,
    COUNT(*) FILTER (WHERE ss.stato_sensore = 'OFFLINE')::integer AS n_sensori_offline,
    MAX(ss.ultima_lettura_at) AS ultima_lettura_at,
    ARRAY_AGG(DISTINCT ss.tipo ORDER BY ss.tipo) AS tipi_sensore,
    ARRAY_AGG(ss.stato_sensore ORDER BY ss.stato_sensore) AS stati_sensori
  FROM sensori_stato ss
  GROUP BY ss.albero_id, ss.site_id
)
SELECT
  a.id AS albero_id,
  a.codice,
  a.specie_comune,
  a.specie_botanica,
  a.latitude,
  a.longitude,
  a.comune,
  a.indirizzo,
  a.stato AS stato_albero,
  CASE
    WHEN ag.n_sensori IS NULL OR ag.n_sensori = 0 THEN 'SCONOSCIUTO'::public.tm_stato_salute
    ELSE public.tm_peggior_stato(ag.stati_sensori)
  END AS stato_salute,
  COALESCE(ag.n_sensori, 0) AS n_sensori,
  COALESCE(ag.n_sensori_offline, 0) AS n_sensori_offline,
  ag.ultima_lettura_at,
  COALESCE(ag.tipi_sensore, ARRAY[]::public.tm_tipo_sensore[]) AS tipi_sensore,
  COALESCE(
    NULLIF(cl."businessName", ''),
    NULLIF(trim(cl."individualFirstName" || ' ' || cl."individualLastName"), ''),
    NULL
  ) AS cliente_nome,
  COALESCE(t.name, t.title) AS task_titolo,
  a."clientId" AS client_id,
  a."taskId" AS task_id,
  a.site_id
FROM public.tm_alberi a
LEFT JOIN aggregati ag ON ag.albero_id = a.id
LEFT JOIN public."Client" cl ON cl.id = a."clientId"
LEFT JOIN public."Task" t ON t.id = a."taskId"
WHERE a.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.tm_alberi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_sensori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_letture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_soglie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tm_alberi_select_site_access ON public.tm_alberi;
DROP POLICY IF EXISTS tm_alberi_insert_site_access ON public.tm_alberi;
DROP POLICY IF EXISTS tm_alberi_update_site_access ON public.tm_alberi;
DROP POLICY IF EXISTS tm_alberi_delete_site_access ON public.tm_alberi;
CREATE POLICY tm_alberi_select_site_access ON public.tm_alberi
  FOR SELECT TO authenticated USING (public.user_can_access_site(site_id));
CREATE POLICY tm_alberi_insert_site_access ON public.tm_alberi
  FOR INSERT TO authenticated WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_alberi_update_site_access ON public.tm_alberi
  FOR UPDATE TO authenticated
  USING (public.user_can_access_site(site_id))
  WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_alberi_delete_site_access ON public.tm_alberi
  FOR DELETE TO authenticated USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS tm_sensori_select_site_access ON public.tm_sensori;
DROP POLICY IF EXISTS tm_sensori_insert_site_access ON public.tm_sensori;
DROP POLICY IF EXISTS tm_sensori_update_site_access ON public.tm_sensori;
DROP POLICY IF EXISTS tm_sensori_delete_site_access ON public.tm_sensori;
CREATE POLICY tm_sensori_select_site_access ON public.tm_sensori
  FOR SELECT TO authenticated USING (public.user_can_access_site(site_id));
CREATE POLICY tm_sensori_insert_site_access ON public.tm_sensori
  FOR INSERT TO authenticated WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_sensori_update_site_access ON public.tm_sensori
  FOR UPDATE TO authenticated
  USING (public.user_can_access_site(site_id))
  WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_sensori_delete_site_access ON public.tm_sensori
  FOR DELETE TO authenticated USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS tm_letture_select_site_access ON public.tm_letture;
DROP POLICY IF EXISTS tm_letture_insert_site_access ON public.tm_letture;
DROP POLICY IF EXISTS tm_letture_update_site_access ON public.tm_letture;
DROP POLICY IF EXISTS tm_letture_delete_site_access ON public.tm_letture;
CREATE POLICY tm_letture_select_site_access ON public.tm_letture
  FOR SELECT TO authenticated USING (public.user_can_access_site(site_id));
CREATE POLICY tm_letture_insert_site_access ON public.tm_letture
  FOR INSERT TO authenticated WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_letture_update_site_access ON public.tm_letture
  FOR UPDATE TO authenticated
  USING (public.user_can_access_site(site_id))
  WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_letture_delete_site_access ON public.tm_letture
  FOR DELETE TO authenticated USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS tm_soglie_select_site_access ON public.tm_soglie;
DROP POLICY IF EXISTS tm_soglie_insert_site_access ON public.tm_soglie;
DROP POLICY IF EXISTS tm_soglie_update_site_access ON public.tm_soglie;
DROP POLICY IF EXISTS tm_soglie_delete_site_access ON public.tm_soglie;
CREATE POLICY tm_soglie_select_site_access ON public.tm_soglie
  FOR SELECT TO authenticated USING (public.user_can_access_site(site_id));
CREATE POLICY tm_soglie_insert_site_access ON public.tm_soglie
  FOR INSERT TO authenticated WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_soglie_update_site_access ON public.tm_soglie
  FOR UPDATE TO authenticated
  USING (public.user_can_access_site(site_id))
  WITH CHECK (public.user_can_access_site(site_id));
CREATE POLICY tm_soglie_delete_site_access ON public.tm_soglie
  FOR DELETE TO authenticated USING (public.user_can_access_site(site_id));

COMMIT;

-- Report RLS (verifica post-migration):
-- tm_alberi   | ON | select/insert/update/delete | basso | —
-- tm_sensori  | ON | select/insert/update/delete | basso | —
-- tm_letture  | ON | select/insert/update/delete | basso | —
-- tm_soglie   | ON | select/insert/update/delete | basso | —
