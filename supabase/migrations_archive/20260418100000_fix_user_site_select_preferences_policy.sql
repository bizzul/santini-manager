-- Fix RLS policy on user_site_select_preferences.
-- The original migration (20260407124000) used `auth.role() = 'superadmin'`,
-- but `auth.role()` in Supabase returns the PostgREST role
-- (`authenticated` / `anon` / `service_role`), NOT the application role.
-- The policy therefore ALWAYS evaluated to false, blocking every upsert
-- made from the user-scoped Supabase client and breaking drag&drop
-- reordering on `/sites/select` for superadmins.
--
-- Align this policy with the convention used elsewhere in this repo
-- (see e.g. 20260303000000_user_permissions.sql, 20260129000000_add_site_ai_settings.sql):
-- resolve the application role through the `"User"` table.

DROP POLICY IF EXISTS users_manage_own_site_select_preferences
  ON public.user_site_select_preferences;

CREATE POLICY users_manage_own_site_select_preferences
  ON public.user_site_select_preferences
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'superadmin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'superadmin'
    )
  );
