-- Aggiunge i codici Materiale e Vetro/Telaio ai prodotti in vendita.
-- Nessuna modifica RLS necessaria: le policy esistenti su "SellProduct"
-- (sellproduct_select/insert/update/delete_site_access) sono row-level e
-- basate su site_id, quindi coprono automaticamente le nuove colonne. I grant
-- di tabella per anon/authenticated/service_role sono gia' presenti dal baseline.

alter table "public"."SellProduct"
  add column if not exists "cod_materiale" text,
  add column if not exists "cod_vetro_telaio" text;

comment on column "public"."SellProduct"."cod_materiale" is
  'Codice materiale (es. LEG, ALU, PVC, LEA, PAL, MDF, TRC, MAS, LAM, IMP). Import CSV: COD_MATERIALE.';
comment on column "public"."SellProduct"."cod_vetro_telaio" is
  'Codice vetro/telaio (es. VC2, VC3, VSIC, VAC). Import CSV: COD_VETRO_TELAIO.';

-- Indici opzionali per filtri/aggregazioni future (facoltativi, non distruttivi)
create index if not exists "SellProduct_cod_materiale_idx"
  on "public"."SellProduct" using btree ("site_id", "cod_materiale")
  where "cod_materiale" is not null;
create index if not exists "SellProduct_cod_vetro_telaio_idx"
  on "public"."SellProduct" using btree ("site_id", "cod_vetro_telaio")
  where "cod_vetro_telaio" is not null;
