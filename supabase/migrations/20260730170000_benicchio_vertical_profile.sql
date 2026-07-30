-- Benicchio: profilo verticale con etichetta "Progettazione" al posto di "AVOR"
-- nelle dashboard Overview e Progettazione (tab /avor).

BEGIN;

INSERT INTO public.site_settings (site_id, setting_key, setting_value)
SELECT s.id, 'vertical_profile', '"benicchio"'::jsonb
FROM public.sites s
WHERE s.subdomain = 'benicchio'
ON CONFLICT (site_id, setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      updated_at = NOW();

COMMIT;

-- Verifica
SELECT s.subdomain, ss.setting_value
FROM public.site_settings ss
JOIN public.sites s ON s.id = ss.site_id
WHERE s.subdomain = 'benicchio' AND ss.setting_key = 'vertical_profile';
-- ATTESO: setting_value = "benicchio"
