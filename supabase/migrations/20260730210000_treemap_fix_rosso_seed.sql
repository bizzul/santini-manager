-- Corregge le ultime letture di BEN-ALB-005 (Lugano) per stato ROSSO aggregato
-- Il seed originale produceva ~23.6 %VWC a now() (VERDE), non fuori soglia.

BEGIN;

UPDATE public.tm_letture l
SET valore = v.target
FROM public.tm_sensori s
JOIN public.tm_alberi a ON a.id = s.albero_id
JOIN (
  VALUES
    ('TT-LUG-005'::text, 8::numeric),
    ('TT-LUG-006'::text, -95::numeric),
    ('TT-LUG-007'::text, 0.08::numeric)
) AS v(seriale, target) ON v.seriale = s.seriale
WHERE l.sensore_id = s.id
  AND a.codice = 'BEN-ALB-005'
  AND l.misurato_at = (
    SELECT max(l2.misurato_at)
    FROM public.tm_letture l2
    WHERE l2.sensore_id = s.id
  );

COMMIT;
