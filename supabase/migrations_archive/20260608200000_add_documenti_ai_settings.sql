-- Config AI dedicata al generatore documenti (override opzionale rispetto alla config globale)

ALTER TABLE public.site_ai_settings
ADD COLUMN IF NOT EXISTS documenti_ai_provider text,
ADD COLUMN IF NOT EXISTS documenti_ai_model text,
ADD COLUMN IF NOT EXISTS documenti_ai_api_key text;

COMMENT ON COLUMN public.site_ai_settings.documenti_ai_provider IS 'Provider AI per generazione documenti (override opzionale)';
COMMENT ON COLUMN public.site_ai_settings.documenti_ai_model IS 'Modello AI per generazione documenti';
COMMENT ON COLUMN public.site_ai_settings.documenti_ai_api_key IS 'API key dedicata generazione documenti (server-only)';
