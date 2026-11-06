-- Configurazione e calcolo congelati sulla riga d'offerta.
--
-- Oggi la riga porta solo descrizione, misure come testo e prezzo unitario:
-- gli input che hanno prodotto quel prezzo (misure in mm, coefficienti,
-- supplementi) si perdono appena la riga entra nel documento. Senza di essi
-- la schermata di verifica non puo' ne' ricalcolare ne' spiegare il prezzo.
--
-- 'calcolo' congela la catena e gli avvisi al momento del calcolo. Non si
-- versiona il listino: un'offerta di gennaio resta riproducibile anche dopo
-- tre aggiornamenti di prezzo, e il PDF del cliente corrisponde sempre a
-- quello che il sistema aveva calcolato.

alter table public.righe_documento
  add column if not exists configurazione jsonb,
  add column if not exists calcolo        jsonb;

comment on column public.righe_documento.configurazione is
  'Input del motore prezzi: misure mm, codici coefficiente, supplementi.';
comment on column public.righe_documento.calcolo is
  'Esito congelato: stato (quotata/manuale/da_quotare), breakdown, avvisi.';
