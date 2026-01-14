-- Rollback: Remove internal_activities table

-- Drop policies
DROP POLICY IF EXISTS "internal_activities_select" ON public.internal_activities;
DROP POLICY IF EXISTS "internal_activities_insert" ON public.internal_activities;
DROP POLICY IF EXISTS "internal_activities_update" ON public.internal_activities;
DROP POLICY IF EXISTS "internal_activities_delete" ON public.internal_activities;

-- Drop trigger
DROP TRIGGER IF EXISTS trg_internal_activities_updated_at ON public.internal_activities;

-- Drop table (will also drop indexes and constraints)
DROP TABLE IF EXISTS public.internal_activities CASCADE;
