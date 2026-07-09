ALTER TABLE public.sellproduct_categories
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS supplier_names TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.sellproduct_categories.icon IS
'Nome icona usata nella configurazione categorie prodotto';

COMMENT ON COLUMN public.sellproduct_categories.icon_color IS
'Colore dell''icona categoria prodotto';

COMMENT ON COLUMN public.sellproduct_categories.image_url IS
'Immagine quadrata opzionale usata al posto dell''icona';

COMMENT ON COLUMN public.sellproduct_categories.supplier_names IS
'Elenco fornitori suggeriti per la categoria prodotto';
