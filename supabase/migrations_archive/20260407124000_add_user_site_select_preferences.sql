CREATE TABLE IF NOT EXISTS public.user_site_select_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL CHECK (group_key IN ('active', 'custom', 'beta', 'alpha')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_user_site_select_preferences_site_id
  ON public.user_site_select_preferences(site_id);

ALTER TABLE public.user_site_select_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_manage_own_site_select_preferences
  ON public.user_site_select_preferences;

CREATE POLICY users_manage_own_site_select_preferences
  ON public.user_site_select_preferences
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND auth.role() = 'superadmin'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'superadmin'
  );

DROP TRIGGER IF EXISTS trg_user_site_select_preferences_updated_at
  ON public.user_site_select_preferences;

CREATE TRIGGER trg_user_site_select_preferences_updated_at
  BEFORE UPDATE ON public.user_site_select_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON TABLE public.user_site_select_preferences TO authenticated, service_role;
