-- Template di righe base per lo spazio Santini.
--
-- I testi non sono inventati: vengono dai blocchi descrittivi ricorrenti
-- delle 153 offerte 2026 (Aluplast/Siegenia/Secustik 44 volte, Grauthoff 36).
-- Ogni riga si aggancia al prodotto rappresentante della sua famiglia.
--
-- Solo dati, nessuno schema. Rilanciabile: on conflict do nothing.

do $$
declare
  v_site uuid := '7ce3bca0-2293-4328-bee3-b8347c581b5b';
  v_tpl  uuid;
  v_txt_pvc text := 'Fornitura e posa di serramenti in PVC Aluplast, profilo a cinque camere, ferramenta Siegenia con dispositivo Secustik, vetro isolante triplo Ug = 0.6 W/m2K, guarnizioni perimetrali, colore bianco RAL 9016 su entrambi i lati.';
  v_txt_porta text := 'Fornitura e posa di porta interna Grauthoff, anta RSP spessore 40 mm, rivestimento CPL bianco, isolamento acustico 28 dB, telaio regolabile e ferramenta standard.';
begin

  -- ---------------------------------------------------------------- Serramenti
  insert into public.offerta_template (site_id, categoria, nome, descrizione)
  values (v_site, 'Serramenti', 'Serramenti PVC standard',
          'Finestre e porte-finestra in PVC Aluplast, esecuzione corrente')
  on conflict (site_id, categoria, nome) do nothing;

  select id into v_tpl from public.offerta_template
  where site_id = v_site and categoria = 'Serramenti'
    and nome = 'Serramenti PVC standard';

  if not exists (select 1 from public.offerta_template_riga where template_id = v_tpl) then
    insert into public.offerta_template_riga
      (template_id, ordine, sell_product_id, descrizione, testo_base, unita, quantita_default, richiede_misure)
    values
      (v_tpl, 10,
       (select id from public."SellProduct" where site_id = v_site and famiglia_apertura_cod = 'FIN_BATT_2A' limit 1),
       'Finestra PVC 2 ante', v_txt_pvc, 'Pz.', 1, true),
      (v_tpl, 20,
       (select id from public."SellProduct" where site_id = v_site and famiglia_apertura_cod = 'FIN_BATT_1A' limit 1),
       'Finestra PVC 1 anta', v_txt_pvc, 'Pz.', 1, true),
      (v_tpl, 30,
       (select id from public."SellProduct" where site_id = v_site and famiglia_apertura_cod = 'FIN_FISSA' limit 1),
       'Finestra fissa', v_txt_pvc, 'Pz.', 1, true),
      (v_tpl, 40,
       (select id from public."SellProduct" where site_id = v_site and famiglia_apertura_cod = 'PF_BATT_2A' limit 1),
       'Porta-finestra 2 ante', v_txt_pvc, 'Pz.', 1, true);
  end if;

  -- --------------------------------------------------------------------- Porte
  insert into public.offerta_template (site_id, categoria, nome, descrizione)
  values (v_site, 'Porte', 'Porte interne standard',
          'Porte interne Grauthoff, esecuzione corrente')
  on conflict (site_id, categoria, nome) do nothing;

  select id into v_tpl from public.offerta_template
  where site_id = v_site and categoria = 'Porte' and nome = 'Porte interne standard';

  if not exists (select 1 from public.offerta_template_riga where template_id = v_tpl) then
    insert into public.offerta_template_riga
      (template_id, ordine, sell_product_id, descrizione, testo_base, unita, quantita_default, richiede_misure)
    values
      (v_tpl, 10,
       (select id from public."SellProduct" where site_id = v_site and famiglia_apertura_cod = 'POR_INT' limit 1),
       'Porta interna', v_txt_porta, 'Pz.', 1, true),
      (v_tpl, 20, null,
       'Smontaggio e smaltimento porta esistente',
       'Smontaggio della porta esistente, carico, trasporto e smaltimento in discarica autorizzata.',
       'Pz.', 1, false);
  end if;

  -- ---------------------------------------------------------------------- Posa
  insert into public.offerta_template (site_id, categoria, nome, descrizione)
  values (v_site, 'Posa', 'Posa e cantiere',
          'Voci ricorrenti di cantiere, presenti nella maggior parte delle offerte')
  on conflict (site_id, categoria, nome) do nothing;

  select id into v_tpl from public.offerta_template
  where site_id = v_site and categoria = 'Posa' and nome = 'Posa e cantiere';

  if not exists (select 1 from public.offerta_template_riga where template_id = v_tpl) then
    insert into public.offerta_template_riga
      (template_id, ordine, sell_product_id, descrizione, testo_base, unita, quantita_default, richiede_misure)
    values
      (v_tpl, 10, null, 'Rilievo, disegni e installazione cantiere',
       'Rilievo delle misure sul posto, elaborazione dei disegni esecutivi e installazione del cantiere.',
       'forfait', 1, false),
      (v_tpl, 20, null, 'Smontaggio e smaltimento serramenti esistenti',
       'Smontaggio dei serramenti esistenti, carico, trasporto e smaltimento in discarica autorizzata.',
       'Pz.', 1, false),
      (v_tpl, 30, null, 'Furgone con attrezzi',
       'Trasferta con furgone attrezzato, per giornata di cantiere.',
       'Pz.', 1, false);
  end if;

  -- ------------------------------------------------------------------- Service
  insert into public.offerta_template (site_id, categoria, nome, descrizione)
  values (v_site, 'Service', 'Ore a regia', 'Lavori a regia')
  on conflict (site_id, categoria, nome) do nothing;

  select id into v_tpl from public.offerta_template
  where site_id = v_site and categoria = 'Service' and nome = 'Ore a regia';

  if not exists (select 1 from public.offerta_template_riga where template_id = v_tpl) then
    insert into public.offerta_template_riga
      (template_id, ordine, sell_product_id, descrizione, testo_base, unita, quantita_default, richiede_misure)
    values
      (v_tpl, 10, null, 'Ore a regia',
       'Lavorazioni eseguite a regia, conteggiate a ore effettive.',
       'h', 1, false);
  end if;

end $$;
