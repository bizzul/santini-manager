-- =====================================================
-- Documenti commerciali (Offerta / Conferma / Fattura)
-- Dati neutri separati dal branding per-site
-- =====================================================

CREATE TABLE IF NOT EXISTS public.documenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  task_id integer REFERENCES public."Task"(id) ON DELETE SET NULL,
  tipo_documento text NOT NULL CHECK (tipo_documento IN ('OFFERTA', 'CONFERMA', 'FATTURA')),
  numero text,
  anno integer,
  cliente_id integer REFERENCES public."Client"(id) ON DELETE SET NULL,
  destinatario jsonb NOT NULL DEFAULT '{}'::jsonb,
  oggetto text,
  condizioni_pagamento text[] DEFAULT '{}',
  termine_fornitura text,
  note text,
  tot_netto numeric,
  iva numeric,
  totale_chf numeric,
  source_text text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documenti_site_id_idx ON public.documenti(site_id);
CREATE INDEX IF NOT EXISTS documenti_task_id_idx ON public.documenti(task_id);
CREATE INDEX IF NOT EXISTS documenti_tipo_documento_idx ON public.documenti(tipo_documento);
CREATE INDEX IF NOT EXISTS documenti_numero_idx ON public.documenti(site_id, numero);

CREATE TABLE IF NOT EXISTS public.righe_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.documenti(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  posizione integer NOT NULL,
  art text,
  descrizione text NOT NULL,
  misure text,
  unita text,
  quantita numeric,
  prezzo_unitario numeric,
  sconto numeric,
  totale_riga numeric,
  articolo_id text,
  articolo_source text CHECK (articolo_source IN ('sell_product', 'inventory', 'none')),
  is_trasporto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS righe_documento_documento_id_idx ON public.righe_documento(documento_id);
CREATE INDEX IF NOT EXISTS righe_documento_site_id_idx ON public.righe_documento(site_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_documenti_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documenti_set_updated_at ON public.documenti;
CREATE TRIGGER documenti_set_updated_at
  BEFORE UPDATE ON public.documenti
  FOR EACH ROW
  EXECUTE FUNCTION public.set_documenti_updated_at();

-- RLS
ALTER TABLE public.documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.righe_documento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documenti_select_site_members" ON public.documenti;
CREATE POLICY "documenti_select_site_members"
ON public.documenti
FOR SELECT
TO authenticated
USING (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documenti_insert_site_members" ON public.documenti;
CREATE POLICY "documenti_insert_site_members"
ON public.documenti
FOR INSERT
TO authenticated
WITH CHECK (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documenti_update_site_members" ON public.documenti;
CREATE POLICY "documenti_update_site_members"
ON public.documenti
FOR UPDATE
TO authenticated
USING (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
)
WITH CHECK (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documenti_delete_site_members" ON public.documenti;
CREATE POLICY "documenti_delete_site_members"
ON public.documenti
FOR DELETE
TO authenticated
USING (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "righe_documento_select_site_members" ON public.righe_documento;
CREATE POLICY "righe_documento_select_site_members"
ON public.righe_documento
FOR SELECT
TO authenticated
USING (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "righe_documento_insert_site_members" ON public.righe_documento;
CREATE POLICY "righe_documento_insert_site_members"
ON public.righe_documento
FOR INSERT
TO authenticated
WITH CHECK (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "righe_documento_update_site_members" ON public.righe_documento;
CREATE POLICY "righe_documento_update_site_members"
ON public.righe_documento
FOR UPDATE
TO authenticated
USING (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
)
WITH CHECK (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "righe_documento_delete_site_members" ON public.righe_documento;
CREATE POLICY "righe_documento_delete_site_members"
ON public.righe_documento
FOR DELETE
TO authenticated
USING (
  site_id IN (
    SELECT us.site_id FROM public.user_sites us WHERE us.user_id = auth.uid()
  )
);

GRANT ALL ON public.documenti TO anon, authenticated, service_role;
GRANT ALL ON public.righe_documento TO anon, authenticated, service_role;
