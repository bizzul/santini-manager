CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_demo_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.demo_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    demo_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL,
    sector_key TEXT NOT NULL,
    scenario_type TEXT NOT NULL DEFAULT 'full_suite',
    display_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_company TEXT,
    customer_contact_name TEXT,
    customer_contact_email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('provisioning', 'active', 'expired', 'revoked', 'failed')
    ),
    branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    landing_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    seed_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    first_landing_view_at TIMESTAMPTZ,
    first_login_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    last_magic_link_at TIMESTAMPTZ,
    last_ip_address INET,
    last_user_agent TEXT,
    login_count INTEGER NOT NULL DEFAULT 0,
    landing_view_count INTEGER NOT NULL DEFAULT 0,
    magic_link_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (site_id),
    UNIQUE (demo_user_id)
);

CREATE TABLE IF NOT EXISTS public.demo_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.demo_workspaces(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    label TEXT,
    redirect_path TEXT NOT NULL DEFAULT '/dashboard',
    use_policy TEXT NOT NULL DEFAULT 'multi_use' CHECK (
        use_policy IN ('single_use', 'multi_use')
    ),
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.demo_access_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.demo_workspaces(id) ON DELETE CASCADE,
    access_token_id UUID REFERENCES public.demo_access_tokens(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'landing_view',
            'cta_click',
            'magic_link_generated',
            'login_success',
            'session_started',
            'invalid_token',
            'expired_token',
            'revoked_token'
        )
    ),
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    country TEXT,
    city TEXT,
    referrer TEXT,
    landing_path TEXT,
    redirect_path TEXT,
    customer_name_snapshot TEXT,
    customer_company_snapshot TEXT,
    event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_workspaces_status ON public.demo_workspaces(status);
CREATE INDEX IF NOT EXISTS idx_demo_workspaces_expires_at ON public.demo_workspaces(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_workspaces_last_login_at ON public.demo_workspaces(last_login_at);
CREATE INDEX IF NOT EXISTS idx_demo_workspaces_customer_company ON public.demo_workspaces(customer_company);

CREATE INDEX IF NOT EXISTS idx_demo_access_tokens_workspace_id ON public.demo_access_tokens(workspace_id);
CREATE INDEX IF NOT EXISTS idx_demo_access_tokens_expires_at ON public.demo_access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_access_tokens_revoked_at ON public.demo_access_tokens(revoked_at);

CREATE INDEX IF NOT EXISTS idx_demo_access_events_workspace_id ON public.demo_access_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_demo_access_events_token_id ON public.demo_access_events(access_token_id);
CREATE INDEX IF NOT EXISTS idx_demo_access_events_type_created_at ON public.demo_access_events(event_type, created_at DESC);

ALTER TABLE public.demo_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_access_events ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_demo_workspaces_updated_at ON public.demo_workspaces;
CREATE TRIGGER trg_demo_workspaces_updated_at
BEFORE UPDATE ON public.demo_workspaces
FOR EACH ROW
EXECUTE FUNCTION public.set_demo_updated_at();

GRANT ALL ON public.demo_workspaces TO authenticated, service_role;
GRANT ALL ON public.demo_access_tokens TO authenticated, service_role;
GRANT ALL ON public.demo_access_events TO authenticated, service_role;

COMMENT ON TABLE public.demo_workspaces IS 'Dedicated demo workspaces created for individual prospects or customers.';
COMMENT ON TABLE public.demo_access_tokens IS 'Reusable or single-use QR/link tokens that grant access to a demo workspace.';
COMMENT ON TABLE public.demo_access_events IS 'Analytics trail for landing views, magic-link generation and demo logins.';
