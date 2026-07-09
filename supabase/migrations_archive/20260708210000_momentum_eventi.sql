-- =====================================================
-- Momentum (Eventi) module
-- Tabelle ev_* per gestione eventi/DJ set multi-tenant per site
-- =====================================================

-- ---------- ev_clienti ----------
CREATE TABLE IF NOT EXISTS public.ev_clienti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('privato', 'azienda', 'ente')),
  email text,
  telefono text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------- ev_location ----------
CREATE TABLE IF NOT EXISTS public.ev_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  nome text NOT NULL,
  indirizzo text,
  citta text,
  capienza int,
  note_logistiche text,
  contatto_referente text,
  telefono text,
  lat numeric,
  lng numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------- ev_fornitori ----------
CREATE TABLE IF NOT EXISTS public.ev_fornitori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('location', 'artisti', 'food', 'beverage', 'materials', 'marketing', 'staff_security')),
  email text,
  telefono text,
  note text,
  costo_indicativo numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------- ev_offerte ----------
-- evento_id FK aggiunta piu' avanti (dipendenza circolare con ev_eventi)
CREATE TABLE IF NOT EXISTS public.ev_offerte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.ev_clienti(id) ON DELETE SET NULL,
  titolo text NOT NULL,
  categoria_prodotto text NOT NULL CHECK (categoria_prodotto IN ('pvt_event', 'public_event', 'other')),
  stato text NOT NULL DEFAULT 'richiesta' CHECK (stato IN ('richiesta', 'in_elaborazione', 'offerta_inviata', 'in_trattativa', 'vinta', 'persa')),
  data_evento_prevista date,
  importo_offerto numeric,
  note text,
  evento_id uuid,
  lat numeric,
  lng numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------- ev_eventi ----------
CREATE TABLE IF NOT EXISTS public.ev_eventi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  offerta_id uuid REFERENCES public.ev_offerte(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.ev_clienti(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.ev_location(id) ON DELETE SET NULL,
  titolo text NOT NULL,
  tipo_evento text NOT NULL CHECK (tipo_evento IN ('pvt', 'public')),
  categoria_prodotto text NOT NULL CHECK (categoria_prodotto IN ('pvt_event', 'public_event', 'other')),
  stato_plan text NOT NULL DEFAULT 'to_plan' CHECK (stato_plan IN ('to_plan', 'planning', 'planned', 'confirmed', 'live', 'finish')),
  stato_accounting text CHECK (stato_accounting IN ('invoice_in', 'invoice_out', 'balance', 'close')),
  data_evento date,
  ora_inizio time,
  ora_fine time,
  budget_previsto numeric,
  ricavo_previsto numeric,
  note text,
  lat numeric,
  lng numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- FK differita: ev_offerte.evento_id -> ev_eventi(id)
ALTER TABLE public.ev_offerte
  DROP CONSTRAINT IF EXISTS ev_offerte_evento_id_fkey;
ALTER TABLE public.ev_offerte
  ADD CONSTRAINT ev_offerte_evento_id_fkey
  FOREIGN KEY (evento_id) REFERENCES public.ev_eventi(id) ON DELETE SET NULL;

-- ---------- ev_eventi_fornitori (join evento <-> fornitore) ----------
CREATE TABLE IF NOT EXISTS public.ev_eventi_fornitori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES public.ev_eventi(id) ON DELETE CASCADE,
  fornitore_id uuid NOT NULL REFERENCES public.ev_fornitori(id) ON DELETE CASCADE,
  ruolo text,
  stato_ingaggio text NOT NULL DEFAULT 'da_contattare' CHECK (stato_ingaggio IN ('da_contattare', 'in_trattativa', 'confermato', 'pagato')),
  costo numeric,
  rider_ricevuto boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------- ev_eventi_task ----------
CREATE TABLE IF NOT EXISTS public.ev_eventi_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES public.ev_eventi(id) ON DELETE CASCADE,
  titolo text NOT NULL,
  stato text NOT NULL DEFAULT 'da_fare' CHECK (stato IN ('da_fare', 'in_corso', 'in_attesa_terzi', 'fatto')),
  scadenza date,
  assegnatario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------- ev_fatture ----------
CREATE TABLE IF NOT EXISTS public.ev_fatture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  evento_id uuid REFERENCES public.ev_eventi(id) ON DELETE CASCADE,
  direzione text NOT NULL CHECK (direzione IN ('in', 'out')),
  descrizione text,
  importo numeric NOT NULL,
  stato text NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'pagata', 'incassata', 'stornata')),
  data_scadenza date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- =====================================================
-- Indici (site_id + FK principali + stati per kanban)
-- =====================================================
CREATE INDEX IF NOT EXISTS ev_clienti_site_id_idx ON public.ev_clienti(site_id);
CREATE INDEX IF NOT EXISTS ev_location_site_id_idx ON public.ev_location(site_id);
CREATE INDEX IF NOT EXISTS ev_fornitori_site_id_idx ON public.ev_fornitori(site_id);
CREATE INDEX IF NOT EXISTS ev_fornitori_categoria_idx ON public.ev_fornitori(categoria);

CREATE INDEX IF NOT EXISTS ev_offerte_site_id_idx ON public.ev_offerte(site_id);
CREATE INDEX IF NOT EXISTS ev_offerte_cliente_id_idx ON public.ev_offerte(cliente_id);
CREATE INDEX IF NOT EXISTS ev_offerte_evento_id_idx ON public.ev_offerte(evento_id);
CREATE INDEX IF NOT EXISTS ev_offerte_stato_idx ON public.ev_offerte(stato);

CREATE INDEX IF NOT EXISTS ev_eventi_site_id_idx ON public.ev_eventi(site_id);
CREATE INDEX IF NOT EXISTS ev_eventi_cliente_id_idx ON public.ev_eventi(cliente_id);
CREATE INDEX IF NOT EXISTS ev_eventi_location_id_idx ON public.ev_eventi(location_id);
CREATE INDEX IF NOT EXISTS ev_eventi_offerta_id_idx ON public.ev_eventi(offerta_id);
CREATE INDEX IF NOT EXISTS ev_eventi_stato_plan_idx ON public.ev_eventi(stato_plan);
CREATE INDEX IF NOT EXISTS ev_eventi_stato_accounting_idx ON public.ev_eventi(stato_accounting);
CREATE INDEX IF NOT EXISTS ev_eventi_tipo_evento_idx ON public.ev_eventi(tipo_evento);

CREATE INDEX IF NOT EXISTS ev_eventi_fornitori_site_id_idx ON public.ev_eventi_fornitori(site_id);
CREATE INDEX IF NOT EXISTS ev_eventi_fornitori_evento_id_idx ON public.ev_eventi_fornitori(evento_id);
CREATE INDEX IF NOT EXISTS ev_eventi_fornitori_fornitore_id_idx ON public.ev_eventi_fornitori(fornitore_id);

CREATE INDEX IF NOT EXISTS ev_eventi_task_site_id_idx ON public.ev_eventi_task(site_id);
CREATE INDEX IF NOT EXISTS ev_eventi_task_evento_id_idx ON public.ev_eventi_task(evento_id);

CREATE INDEX IF NOT EXISTS ev_fatture_site_id_idx ON public.ev_fatture(site_id);
CREATE INDEX IF NOT EXISTS ev_fatture_evento_id_idx ON public.ev_fatture(evento_id);

-- =====================================================
-- updated_at triggers (riuso funzione condivisa public.set_updated_at)
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ev_clienti_set_updated_at ON public.ev_clienti;
CREATE TRIGGER ev_clienti_set_updated_at BEFORE UPDATE ON public.ev_clienti
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ev_location_set_updated_at ON public.ev_location;
CREATE TRIGGER ev_location_set_updated_at BEFORE UPDATE ON public.ev_location
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ev_fornitori_set_updated_at ON public.ev_fornitori;
CREATE TRIGGER ev_fornitori_set_updated_at BEFORE UPDATE ON public.ev_fornitori
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ev_offerte_set_updated_at ON public.ev_offerte;
CREATE TRIGGER ev_offerte_set_updated_at BEFORE UPDATE ON public.ev_offerte
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ev_eventi_set_updated_at ON public.ev_eventi;
CREATE TRIGGER ev_eventi_set_updated_at BEFORE UPDATE ON public.ev_eventi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ev_eventi_fornitori_set_updated_at ON public.ev_eventi_fornitori;
CREATE TRIGGER ev_eventi_fornitori_set_updated_at BEFORE UPDATE ON public.ev_eventi_fornitori
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ev_eventi_task_set_updated_at ON public.ev_eventi_task;
CREATE TRIGGER ev_eventi_task_set_updated_at BEFORE UPDATE ON public.ev_eventi_task
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ev_fatture_set_updated_at ON public.ev_fatture;
CREATE TRIGGER ev_fatture_set_updated_at BEFORE UPDATE ON public.ev_fatture
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- Automazione: offerta vinta -> creazione evento (atomica, idempotente)
-- =====================================================
CREATE OR REPLACE FUNCTION public.ev_handle_offerta_vinta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_evento_id uuid;
  derived_tipo text;
BEGIN
  IF NEW.stato = 'vinta' AND NEW.evento_id IS NULL THEN
    derived_tipo := CASE NEW.categoria_prodotto
      WHEN 'pvt_event' THEN 'pvt'
      WHEN 'public_event' THEN 'public'
      ELSE 'pvt'
    END;

    INSERT INTO public.ev_eventi (
      site_id, offerta_id, cliente_id, titolo, tipo_evento,
      categoria_prodotto, stato_plan, data_evento, ricavo_previsto, lat, lng
    ) VALUES (
      NEW.site_id, NEW.id, NEW.cliente_id, NEW.titolo, derived_tipo,
      NEW.categoria_prodotto, 'to_plan', NEW.data_evento_prevista, NEW.importo_offerto, NEW.lat, NEW.lng
    )
    RETURNING id INTO new_evento_id;

    NEW.evento_id := new_evento_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ev_offerte_vinta_trigger ON public.ev_offerte;
CREATE TRIGGER ev_offerte_vinta_trigger
  BEFORE UPDATE OF stato ON public.ev_offerte
  FOR EACH ROW
  EXECUTE FUNCTION public.ev_handle_offerta_vinta();

-- =====================================================
-- RLS: abilita e policy site-scoped su tutte le ev_*
-- =====================================================
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'ev_clienti', 'ev_location', 'ev_fornitori', 'ev_offerte',
    'ev_eventi', 'ev_eventi_fornitori', 'ev_eventi_task', 'ev_fatture'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_select_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (public.user_can_access_site(site_id));
    $f$, t || '_select_site_access', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_insert_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
      WITH CHECK (public.user_can_access_site(site_id));
    $f$, t || '_insert_site_access', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_update_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
      USING (public.user_can_access_site(site_id))
      WITH CHECK (public.user_can_access_site(site_id));
    $f$, t || '_update_site_access', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_delete_site_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
      USING (public.user_can_access_site(site_id));
    $f$, t || '_delete_site_access', t);

    EXECUTE format('GRANT ALL ON public.%I TO authenticated, service_role;', t);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.ev_handle_offerta_vinta() TO authenticated, service_role;
