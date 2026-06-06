-- Helper RLS: accesso al sito via user_sites, user_organizations o superadmin

CREATE OR REPLACE FUNCTION public.user_can_access_site(target_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'superadmin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_sites us
      WHERE us.site_id = target_site_id
        AND us.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.sites s
      INNER JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE s.id = target_site_id
        AND uo.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_site(uuid) TO authenticated, service_role;

-- documenti
DROP POLICY IF EXISTS "documenti_select_site_members" ON public.documenti;
DROP POLICY IF EXISTS "documenti_insert_site_members" ON public.documenti;
DROP POLICY IF EXISTS "documenti_update_site_members" ON public.documenti;
DROP POLICY IF EXISTS "documenti_delete_site_members" ON public.documenti;

CREATE POLICY "documenti_select_site_access"
ON public.documenti FOR SELECT TO authenticated
USING (public.user_can_access_site(site_id));

CREATE POLICY "documenti_insert_site_access"
ON public.documenti FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_site(site_id));

CREATE POLICY "documenti_update_site_access"
ON public.documenti FOR UPDATE TO authenticated
USING (public.user_can_access_site(site_id))
WITH CHECK (public.user_can_access_site(site_id));

CREATE POLICY "documenti_delete_site_access"
ON public.documenti FOR DELETE TO authenticated
USING (public.user_can_access_site(site_id));

-- righe_documento
DROP POLICY IF EXISTS "righe_documento_select_site_members" ON public.righe_documento;
DROP POLICY IF EXISTS "righe_documento_insert_site_members" ON public.righe_documento;
DROP POLICY IF EXISTS "righe_documento_update_site_members" ON public.righe_documento;
DROP POLICY IF EXISTS "righe_documento_delete_site_members" ON public.righe_documento;

CREATE POLICY "righe_documento_select_site_access"
ON public.righe_documento FOR SELECT TO authenticated
USING (public.user_can_access_site(site_id));

CREATE POLICY "righe_documento_insert_site_access"
ON public.righe_documento FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_site(site_id));

CREATE POLICY "righe_documento_update_site_access"
ON public.righe_documento FOR UPDATE TO authenticated
USING (public.user_can_access_site(site_id))
WITH CHECK (public.user_can_access_site(site_id));

CREATE POLICY "righe_documento_delete_site_access"
ON public.righe_documento FOR DELETE TO authenticated
USING (public.user_can_access_site(site_id));

-- Client: allinea alle policy con helper
DROP POLICY IF EXISTS "Users can view clients from their sites" ON public."Client";
DROP POLICY IF EXISTS "Users can insert clients in their sites" ON public."Client";
DROP POLICY IF EXISTS "Users can update clients in their sites" ON public."Client";
DROP POLICY IF EXISTS "Users can delete clients in their sites" ON public."Client";

CREATE POLICY "client_select_site_access"
ON public."Client" FOR SELECT TO authenticated
USING (site_id IS NOT NULL AND public.user_can_access_site(site_id));

CREATE POLICY "client_insert_site_access"
ON public."Client" FOR INSERT TO authenticated
WITH CHECK (site_id IS NOT NULL AND public.user_can_access_site(site_id));

CREATE POLICY "client_update_site_access"
ON public."Client" FOR UPDATE TO authenticated
USING (site_id IS NOT NULL AND public.user_can_access_site(site_id))
WITH CHECK (site_id IS NOT NULL AND public.user_can_access_site(site_id));

CREATE POLICY "client_delete_site_access"
ON public."Client" FOR DELETE TO authenticated
USING (site_id IS NOT NULL AND public.user_can_access_site(site_id));

-- SellProduct: abilita RLS per isolamento catalogo per sito
ALTER TABLE public."SellProduct" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellproduct_select_site_access" ON public."SellProduct";
DROP POLICY IF EXISTS "sellproduct_insert_site_access" ON public."SellProduct";
DROP POLICY IF EXISTS "sellproduct_update_site_access" ON public."SellProduct";
DROP POLICY IF EXISTS "sellproduct_delete_site_access" ON public."SellProduct";

CREATE POLICY "sellproduct_select_site_access"
ON public."SellProduct" FOR SELECT TO authenticated
USING (site_id IS NOT NULL AND public.user_can_access_site(site_id));

CREATE POLICY "sellproduct_insert_site_access"
ON public."SellProduct" FOR INSERT TO authenticated
WITH CHECK (site_id IS NOT NULL AND public.user_can_access_site(site_id));

CREATE POLICY "sellproduct_update_site_access"
ON public."SellProduct" FOR UPDATE TO authenticated
USING (site_id IS NOT NULL AND public.user_can_access_site(site_id))
WITH CHECK (site_id IS NOT NULL AND public.user_can_access_site(site_id));

CREATE POLICY "sellproduct_delete_site_access"
ON public."SellProduct" FOR DELETE TO authenticated
USING (site_id IS NOT NULL AND public.user_can_access_site(site_id));
