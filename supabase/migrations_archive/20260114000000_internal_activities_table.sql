-- Migration: Create internal_activities table for timetracking
-- This replaces hardcoded internal activities with a database-driven approach

-- Create the internal_activities table
CREATE TABLE IF NOT EXISTS public.internal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Unique constraint: code must be unique per site (or globally if site_id is null)
    CONSTRAINT internal_activities_code_site_unique UNIQUE (code, site_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS internal_activities_site_idx ON public.internal_activities(site_id);
CREATE INDEX IF NOT EXISTS internal_activities_active_idx ON public.internal_activities(is_active);
CREATE INDEX IF NOT EXISTS internal_activities_sort_idx ON public.internal_activities(sort_order);

-- Enable RLS
ALTER TABLE public.internal_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "internal_activities_select" ON public.internal_activities
    FOR SELECT TO authenticated
    USING (
        site_id IS NULL OR 
        site_id IN (SELECT id FROM public.sites WHERE id = site_id)
    );

CREATE POLICY "internal_activities_insert" ON public.internal_activities
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "internal_activities_update" ON public.internal_activities
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "internal_activities_delete" ON public.internal_activities
    FOR DELETE TO authenticated
    USING (true);

-- Grant permissions
GRANT ALL ON public.internal_activities TO anon, authenticated, service_role;

-- Create trigger for updated_at
CREATE TRIGGER trg_internal_activities_updated_at
    BEFORE UPDATE ON public.internal_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default activities (global, site_id = NULL means available to all sites)
INSERT INTO public.internal_activities (code, label, sort_order) VALUES
    ('pulizie', 'Pulizie', 10),
    ('manutenzione', 'Manutenzione', 20),
    ('logistica', 'Logistica', 30),
    ('inventario', 'Inventario', 40),
    ('formazione', 'Formazione', 50),
    ('riunione', 'Riunione', 60),
    ('amministrazione_contabilita', 'Amministrazione - Contabilità', 70),
    ('amministrazione_hr', 'Amministrazione - HR', 80),
    ('amministrazione_offerte', 'Amministrazione - Offerte', 90),
    ('amministrazione_altro', 'Amministrazione - Altro', 100),
    ('altro', 'Altro', 999)
ON CONFLICT (code, site_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.internal_activities IS 'Attività interne per il timetracking (es. pulizie, manutenzione, amministrazione)';
