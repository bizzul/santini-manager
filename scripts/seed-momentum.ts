/**
 * Seed dati demo per il modulo Momentum (Eventi) — contesto Ticino.
 *
 * - Crea (se assente) l'organizzazione + spazio con subdomain "momentum".
 * - Abilita il modulo `momentum` in site_modules e concede accesso a tutti gli
 *   utenti esistenti (user_sites / user_organizations).
 * - Popola clienti, location (con coordinate), fornitori nelle 7 categorie.
 * - 6 offerte distribuite sulle colonne; una viene portata a `vinta` via UPDATE
 *   per esercitare il trigger DB offerta-vinta -> evento.
 * - 10 eventi demo (mix PVT/PUBLIC, passato/futuro) con fornitori, task e, per
 *   gli eventi conclusi, fatture in/out.
 *
 * Idempotente: salta record già presenti (match per nome/titolo nello spazio).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-momentum.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars. Run with --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SUBDOMAIN = "momentum";
const ORG_NAME = "Momentum Events";
const SITE_NAME = "Momentum";

// ---- date helpers (relative to today) ----
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return iso(d);
}

async function ensureOrgAndSite(): Promise<{
  siteId: string;
  organizationId: string;
}> {
  const { data: existing } = await supabase
    .from("sites")
    .select("id, organization_id")
    .eq("subdomain", SUBDOMAIN)
    .maybeSingle();

  if (existing) {
    return { siteId: existing.id, organizationId: existing.organization_id };
  }

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: ORG_NAME })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error(`organizations: ${orgErr?.message}`);

  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .insert({
      name: SITE_NAME,
      description: "Spazio demo per la gestione eventi Momentum",
      subdomain: SUBDOMAIN,
      organization_id: org.id,
    })
    .select("id")
    .single();
  if (siteErr || !site) throw new Error(`sites: ${siteErr?.message}`);

  return { siteId: site.id, organizationId: org.id };
}

async function enableModuleAndAccess(siteId: string, organizationId: string) {
  // Abilita il modulo momentum
  const { data: mod } = await supabase
    .from("site_modules")
    .select("id")
    .eq("site_id", siteId)
    .eq("module_name", "momentum")
    .maybeSingle();
  if (!mod) {
    await supabase
      .from("site_modules")
      .insert({ site_id: siteId, module_name: "momentum", is_enabled: true });
  } else {
    await supabase
      .from("site_modules")
      .update({ is_enabled: true })
      .eq("id", mod.id);
  }

  // Concede accesso a tutti gli utenti esistenti
  const { data: users } = await supabase.from("User").select("authId");
  for (const u of users || []) {
    const authId = (u as { authId: string | null }).authId;
    if (!authId) continue;
    const { data: hasSite } = await supabase
      .from("user_sites")
      .select("id")
      .eq("site_id", siteId)
      .eq("user_id", authId)
      .maybeSingle();
    if (!hasSite) {
      await supabase
        .from("user_sites")
        .insert({ site_id: siteId, user_id: authId });
    }
    const { data: hasOrg } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", authId)
      .maybeSingle();
    if (!hasOrg) {
      await supabase
        .from("user_organizations")
        .insert({ organization_id: organizationId, user_id: authId });
    }
  }
}

/** Get-or-create per riga con match su una colonna nome nello spazio. */
async function getOrCreate(
  table: string,
  nameCol: string,
  nameVal: string,
  siteId: string,
  insertObj: Record<string, unknown>
): Promise<string> {
  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("site_id", siteId)
    .eq(nameCol, nameVal)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from(table)
    .insert({ ...insertObj, site_id: siteId })
    .select("id")
    .single();
  if (error || !data) throw new Error(`${table} "${nameVal}": ${error?.message}`);
  return data.id;
}

async function main() {
  console.log("🎧 Seed Momentum (eventi Ticino)\n");
  const { siteId, organizationId } = await ensureOrgAndSite();
  console.log(`✓ Spazio momentum: ${siteId}`);
  await enableModuleAndAccess(siteId, organizationId);
  console.log("✓ Modulo abilitato e accessi concessi");

  // ---- Clienti ----
  const clienti = {
    marco: await getOrCreate("ev_clienti", "nome", "Marco Bernasconi", siteId, {
      nome: "Marco Bernasconi",
      tipo: "privato",
      email: "marco.bernasconi@example.ch",
      telefono: "+41 79 123 45 67",
    }),
    delta: await getOrCreate("ev_clienti", "nome", "Delta SA", siteId, {
      nome: "Delta SA",
      tipo: "azienda",
      email: "eventi@delta-sa.example.ch",
      telefono: "+41 91 234 56 78",
    }),
    comune: await getOrCreate(
      "ev_clienti",
      "nome",
      "Comune di Bellinzona",
      siteId,
      {
        nome: "Comune di Bellinzona",
        tipo: "ente",
        email: "eventi@bellinzona.example.ch",
      }
    ),
    giulia: await getOrCreate("ev_clienti", "nome", "Giulia & Roberto", siteId, {
      nome: "Giulia & Roberto",
      tipo: "privato",
    }),
    galleria: await getOrCreate(
      "ev_clienti",
      "nome",
      "Spazio Arte Mendrisio",
      siteId,
      { nome: "Spazio Arte Mendrisio", tipo: "azienda" }
    ),
  };
  console.log("✓ Clienti");

  // ---- Location (con coordinate Ticino) ----
  const loc = {
    terrazza: await getOrCreate(
      "ev_location",
      "nome",
      "Terrazza Vista Lago Lugano",
      siteId,
      {
        nome: "Terrazza Vista Lago Lugano",
        citta: "Lugano",
        capienza: 120,
        lat: 46.005,
        lng: 8.951,
        note_logistiche: "Accesso ascensore, corrente 32A, stop musica 01:00",
      }
    ),
    capannone: await getOrCreate(
      "ev_location",
      "nome",
      "Ex-Capannone Industriale Giubiasco",
      siteId,
      {
        nome: "Ex-Capannone Industriale Giubiasco",
        citta: "Giubiasco",
        capienza: 600,
        lat: 46.174,
        lng: 9.007,
        note_logistiche: "Carico/scarico mezzi pesanti, vincolo fonometrico 03:00",
      }
    ),
    cortile: await getOrCreate(
      "ev_location",
      "nome",
      "Cortile Storico Bellinzona",
      siteId,
      {
        nome: "Cortile Storico Bellinzona",
        citta: "Bellinzona",
        capienza: 200,
        lat: 46.194,
        lng: 9.024,
      }
    ),
    lungolago: await getOrCreate(
      "ev_location",
      "nome",
      "Lungolago Locarno",
      siteId,
      {
        nome: "Lungolago Locarno",
        citta: "Locarno",
        capienza: 1500,
        lat: 46.166,
        lng: 8.799,
      }
    ),
    galleria: await getOrCreate(
      "ev_location",
      "nome",
      "Galleria d'Arte Mendrisio",
      siteId,
      {
        nome: "Galleria d'Arte Mendrisio",
        citta: "Mendrisio",
        capienza: 80,
        lat: 45.869,
        lng: 8.98,
      }
    ),
    piazza: await getOrCreate(
      "ev_location",
      "nome",
      "Piazza Centrale Bellinzona",
      siteId,
      {
        nome: "Piazza Centrale Bellinzona",
        citta: "Bellinzona",
        capienza: 3000,
        lat: 46.192,
        lng: 9.021,
      }
    ),
    tenuta: await getOrCreate(
      "ev_location",
      "nome",
      "Tenuta Vinicola Malcantone",
      siteId,
      {
        nome: "Tenuta Vinicola Malcantone",
        citta: "Malcantone",
        capienza: 150,
        lat: 45.999,
        lng: 8.87,
      }
    ),
    riazzino: await getOrCreate(
      "ev_location",
      "nome",
      "Capannone Riazzino",
      siteId,
      {
        nome: "Capannone Riazzino",
        citta: "Riazzino",
        capienza: 800,
        lat: 46.17,
        lng: 8.855,
      }
    ),
    hotelRooftop: await getOrCreate(
      "ev_location",
      "nome",
      "Hotel Rooftop Lugano",
      siteId,
      {
        nome: "Hotel Rooftop Lugano",
        citta: "Lugano",
        capienza: 90,
        lat: 46.004,
        lng: 8.952,
      }
    ),
    maggia: await getOrCreate(
      "ev_location",
      "nome",
      "Area Eventi Maggia",
      siteId,
      {
        nome: "Area Eventi Maggia",
        citta: "Maggia",
        capienza: 2000,
        lat: 46.247,
        lng: 8.708,
      }
    ),
  };
  console.log("✓ Location");

  // ---- Fornitori (7 categorie, con sede in Ticino) ----
  const forn = {
    djLuma: await getOrCreate("ev_fornitori", "nome", "DJ Luma", siteId, {
      nome: "DJ Luma",
      categoria: "artisti",
      costo_indicativo: 1800,
      citta: "Lugano",
      lat: 46.003,
      lng: 8.951,
    }),
    djNero: await getOrCreate("ev_fornitori", "nome", "DJ Nero", siteId, {
      nome: "DJ Nero",
      categoria: "artisti",
      costo_indicativo: 2400,
      citta: "Bellinzona",
      lat: 46.195,
      lng: 9.023,
    }),
    saxAndrea: await getOrCreate(
      "ev_fornitori",
      "nome",
      "Sax Live Andrea",
      siteId,
      {
        nome: "Sax Live Andrea",
        categoria: "artisti",
        costo_indicativo: 900,
        citta: "Locarno",
        lat: 46.171,
        lng: 8.795,
      }
    ),
    audioluci: await getOrCreate(
      "ev_fornitori",
      "nome",
      "AudioLuci Service SA",
      siteId,
      {
        nome: "AudioLuci Service SA",
        categoria: "materials",
        costo_indicativo: 3200,
        citta: "Giubiasco",
        lat: 46.172,
        lng: 9.006,
      }
    ),
    catering: await getOrCreate(
      "ev_fornitori",
      "nome",
      "Catering Sapori Ticino",
      siteId,
      {
        nome: "Catering Sapori Ticino",
        categoria: "food",
        costo_indicativo: 2600,
        citta: "Mendrisio",
        lat: 45.87,
        lng: 8.981,
      }
    ),
    barMobile: await getOrCreate(
      "ev_fornitori",
      "nome",
      "Mobile Bar Spritz&Co",
      siteId,
      {
        nome: "Mobile Bar Spritz&Co",
        categoria: "beverage",
        costo_indicativo: 1500,
        citta: "Chiasso",
        lat: 45.833,
        lng: 9.031,
      }
    ),
    security: await getOrCreate(
      "ev_fornitori",
      "nome",
      "SecurEvent Sagl",
      siteId,
      {
        nome: "SecurEvent Sagl",
        categoria: "staff_security",
        costo_indicativo: 1200,
        citta: "Bellinzona",
        lat: 46.19,
        lng: 9.017,
      }
    ),
    social: await getOrCreate("ev_fornitori", "nome", "Social Studio TI", siteId, {
      nome: "Social Studio TI",
      categoria: "marketing",
      costo_indicativo: 700,
      citta: "Lugano",
      lat: 46.006,
      lng: 8.96,
    }),
    locationPartner: await getOrCreate(
      "ev_fornitori",
      "nome",
      "Location Partner Lugano",
      siteId,
      {
        nome: "Location Partner Lugano",
        categoria: "location",
        costo_indicativo: 2000,
        citta: "Paradiso",
        lat: 45.997,
        lng: 8.947,
      }
    ),
  };
  console.log("✓ Fornitori");

  // ---- Offerte (6, distribuite sulle colonne) ----
  const OFFERTE: Array<{
    titolo: string;
    cliente_id: string;
    categoria_prodotto: string;
    stato: string;
    data_evento_prevista: string;
    importo_offerto: number;
    lat?: number;
    lng?: number;
  }> = [
    {
      titolo: "Aperitivo aziendale fine anno",
      cliente_id: clienti.delta,
      categoria_prodotto: "pvt_event",
      stato: "richiesta",
      data_evento_prevista: addDays(80),
      importo_offerto: 8500,
      lat: 46.196,
      lng: 9.026,
    },
    {
      titolo: "Festa 18esimo compleanno",
      cliente_id: clienti.marco,
      categoria_prodotto: "pvt_event",
      stato: "in_elaborazione",
      data_evento_prevista: addDays(55),
      importo_offerto: 4200,
      lat: 46.008,
      lng: 8.955,
    },
    {
      titolo: "Serata inaugurazione flagship store",
      cliente_id: clienti.galleria,
      categoria_prodotto: "public_event",
      stato: "offerta_inviata",
      data_evento_prevista: addDays(48),
      importo_offerto: 12000,
      lat: 45.871,
      lng: 8.984,
    },
    {
      titolo: "Evento benefico comunale",
      cliente_id: clienti.comune,
      categoria_prodotto: "public_event",
      stato: "in_trattativa",
      data_evento_prevista: addDays(66),
      importo_offerto: 15500,
      lat: 46.192,
      lng: 9.021,
    },
    {
      titolo: "Matrimonio autunnale (persa)",
      cliente_id: clienti.giulia,
      categoria_prodotto: "pvt_event",
      stato: "persa",
      data_evento_prevista: addDays(40),
      importo_offerto: 9800,
    },
  ];

  for (const o of OFFERTE) {
    await getOrCreate("ev_offerte", "titolo", o.titolo, siteId, o);
  }

  // Offerta VINTA: inserita non-vinta e poi portata a 'vinta' via UPDATE
  // per esercitare il trigger DB (crea l'evento e valorizza evento_id).
  const vintaTitolo = "Compleanno 40° rooftop (vinta)";
  const vintaOffertaId = await getOrCreate(
    "ev_offerte",
    "titolo",
    vintaTitolo,
    siteId,
    {
      titolo: vintaTitolo,
      cliente_id: clienti.marco,
      categoria_prodotto: "pvt_event",
      stato: "in_trattativa",
      data_evento_prevista: addDays(25),
      importo_offerto: 6800,
      lat: 46.005,
      lng: 8.951,
    }
  );
  const { data: vintaRow } = await supabase
    .from("ev_offerte")
    .select("evento_id")
    .eq("id", vintaOffertaId)
    .single();
  if (!vintaRow?.evento_id) {
    const { error } = await supabase
      .from("ev_offerte")
      .update({ stato: "vinta" })
      .eq("id", vintaOffertaId);
    if (error) throw new Error(`update vinta: ${error.message}`);
    console.log("✓ Offerta vinta -> evento generato via trigger");
  } else {
    console.log("↷ Offerta vinta già collegata a evento");
  }
  console.log("✓ Offerte");

  // ---- 10 Eventi demo ----
  interface EventoDef {
    titolo: string;
    tipo: "pvt" | "public";
    cliente_id: string;
    location_id: string;
    stato_plan: string;
    stato_accounting?: string;
    data_evento: string;
    lat: number;
    lng: number;
    budget: number;
    ricavo: number;
    fornitori: Array<{ id: string; ruolo: string; stato: string; costo: number }>;
    tasks: Array<{ titolo: string; stato: string }>;
    fatture?: Array<{ direzione: "in" | "out"; descrizione: string; importo: number }>;
  }

  const EVENTI: EventoDef[] = [
    {
      titolo: "Sunset Rooftop Session",
      tipo: "pvt",
      cliente_id: clienti.marco,
      location_id: loc.terrazza,
      stato_plan: "confirmed",
      data_evento: addDays(21),
      lat: 46.005,
      lng: 8.951,
      budget: 5200,
      ricavo: 8600,
      fornitori: [
        { id: forn.djLuma, ruolo: "DJ set", stato: "confermato", costo: 1800 },
        { id: forn.barMobile, ruolo: "Open bar", stato: "in_trattativa", costo: 1500 },
        { id: forn.audioluci, ruolo: "Audio-luci", stato: "confermato", costo: 1400 },
      ],
      tasks: [
        { titolo: "Sopralluogo terrazza", stato: "fatto" },
        { titolo: "Conferma scaletta DJ", stato: "in_corso" },
        { titolo: "Permesso musica notturna", stato: "da_fare" },
      ],
    },
    {
      titolo: "Capannone Beats #3",
      tipo: "public",
      cliente_id: clienti.galleria,
      location_id: loc.capannone,
      stato_plan: "planning",
      data_evento: addDays(42),
      lat: 46.174,
      lng: 9.007,
      budget: 14000,
      ricavo: 22000,
      fornitori: [
        { id: forn.djNero, ruolo: "Headliner techno", stato: "in_trattativa", costo: 2400 },
        { id: forn.audioluci, ruolo: "Impianto full", stato: "confermato", costo: 3200 },
        { id: forn.security, ruolo: "Sicurezza", stato: "da_contattare", costo: 1200 },
        { id: forn.social, ruolo: "Promo social", stato: "confermato", costo: 700 },
      ],
      tasks: [
        { titolo: "Contratto headliner", stato: "in_corso" },
        { titolo: "Piano sicurezza", stato: "da_fare" },
        { titolo: "Campagna prevendite", stato: "in_corso" },
        { titolo: "Noleggio generatore", stato: "da_fare" },
      ],
    },
    {
      titolo: "Festa Aziendale Delta SA",
      tipo: "pvt",
      cliente_id: clienti.delta,
      location_id: loc.cortile,
      stato_plan: "planned",
      data_evento: addDays(35),
      lat: 46.194,
      lng: 9.024,
      budget: 9000,
      ricavo: 14500,
      fornitori: [
        { id: forn.saxAndrea, ruolo: "Live band + sax", stato: "confermato", costo: 900 },
        { id: forn.catering, ruolo: "Cena placée", stato: "in_trattativa", costo: 2600 },
        { id: forn.djLuma, ruolo: "DJ after", stato: "da_contattare", costo: 1600 },
      ],
      tasks: [
        { titolo: "Menu degustazione", stato: "in_corso" },
        { titolo: "Layout tavoli", stato: "da_fare" },
        { titolo: "Welcome corporate", stato: "in_attesa_terzi" },
      ],
    },
    {
      titolo: "Lakeside Open Air",
      tipo: "public",
      cliente_id: clienti.comune,
      location_id: loc.lungolago,
      stato_plan: "to_plan",
      data_evento: addDays(60),
      lat: 46.166,
      lng: 8.799,
      budget: 18000,
      ricavo: 30000,
      fornitori: [
        { id: forn.djNero, ruolo: "Line-up", stato: "da_contattare", costo: 2400 },
        { id: forn.audioluci, ruolo: "Palco + audio", stato: "da_contattare", costo: 4000 },
      ],
      tasks: [
        { titolo: "Richiesta autorizzazioni", stato: "da_fare" },
        { titolo: "Definizione line-up", stato: "da_fare" },
      ],
    },
    {
      titolo: "Vernissage & DJ",
      tipo: "pvt",
      cliente_id: clienti.galleria,
      location_id: loc.galleria,
      stato_plan: "confirmed",
      data_evento: addDays(14),
      lat: 45.869,
      lng: 8.98,
      budget: 3200,
      ricavo: 5400,
      fornitori: [
        { id: forn.saxAndrea, ruolo: "Set ambient", stato: "confermato", costo: 900 },
        { id: forn.barMobile, ruolo: "Aperitivo", stato: "confermato", costo: 1100 },
      ],
      tasks: [
        { titolo: "Playlist ambient", stato: "fatto" },
        { titolo: "Allestimento", stato: "in_corso" },
      ],
    },
    {
      titolo: "Notte Bianca Comunale",
      tipo: "public",
      cliente_id: clienti.comune,
      location_id: loc.piazza,
      stato_plan: "planning",
      data_evento: addDays(49),
      lat: 46.192,
      lng: 9.021,
      budget: 22000,
      ricavo: 34000,
      fornitori: [
        { id: forn.djLuma, ruolo: "Main stage", stato: "in_trattativa", costo: 1800 },
        { id: forn.audioluci, ruolo: "Multi-palco", stato: "in_trattativa", costo: 5200 },
        { id: forn.security, ruolo: "Security piazza", stato: "confermato", costo: 2400 },
        { id: forn.social, ruolo: "Comunicazione", stato: "confermato", costo: 900 },
      ],
      tasks: [
        { titolo: "Coordinamento con comune", stato: "in_corso" },
        { titolo: "Mappa palchi", stato: "da_fare" },
        { titolo: "Piano viabilità", stato: "in_attesa_terzi" },
      ],
    },
    {
      titolo: "Matrimonio R&G",
      tipo: "pvt",
      cliente_id: clienti.giulia,
      location_id: loc.tenuta,
      stato_plan: "confirmed",
      data_evento: addDays(28),
      lat: 45.999,
      lng: 8.87,
      budget: 7000,
      ricavo: 11800,
      fornitori: [
        { id: forn.djNero, ruolo: "DJ ricevimento", stato: "confermato", costo: 2200 },
        { id: forn.catering, ruolo: "Banqueting", stato: "confermato", costo: 3400 },
        { id: forn.saxAndrea, ruolo: "Sax cerimonia", stato: "confermato", costo: 800 },
      ],
      tasks: [
        { titolo: "Prima danza", stato: "fatto" },
        { titolo: "Timeline serata", stato: "in_corso" },
        { titolo: "Prova audio", stato: "da_fare" },
      ],
    },
    {
      titolo: "Warehouse NYE",
      tipo: "public",
      cliente_id: clienti.galleria,
      location_id: loc.riazzino,
      stato_plan: "finish",
      stato_accounting: "close",
      data_evento: addDays(-150),
      lat: 46.17,
      lng: 8.855,
      budget: 16000,
      ricavo: 28000,
      fornitori: [
        { id: forn.djNero, ruolo: "Countdown set", stato: "pagato", costo: 2400 },
        { id: forn.audioluci, ruolo: "Impianto", stato: "pagato", costo: 3600 },
        { id: forn.security, ruolo: "Sicurezza", stato: "pagato", costo: 1800 },
      ],
      tasks: [
        { titolo: "Consuntivo", stato: "fatto" },
        { titolo: "Report social", stato: "fatto" },
      ],
      fatture: [
        { direzione: "out", descrizione: "Biglietteria + bar", importo: 28000 },
        { direzione: "in", descrizione: "DJ Nero", importo: 2400 },
        { direzione: "in", descrizione: "AudioLuci Service", importo: 3600 },
        { direzione: "in", descrizione: "Security", importo: 1800 },
      ],
    },
    {
      titolo: "Rooftop Aperitivo Live",
      tipo: "pvt",
      cliente_id: clienti.marco,
      location_id: loc.hotelRooftop,
      stato_plan: "finish",
      stato_accounting: "balance",
      data_evento: addDays(-30),
      lat: 46.004,
      lng: 8.952,
      budget: 3000,
      ricavo: 5200,
      fornitori: [
        { id: forn.saxAndrea, ruolo: "Sax + DJ", stato: "pagato", costo: 1200 },
        { id: forn.barMobile, ruolo: "Aperitivo", stato: "pagato", costo: 1300 },
      ],
      tasks: [
        { titolo: "Chiusura fornitori", stato: "fatto" },
        { titolo: "Fatturazione cliente", stato: "in_corso" },
      ],
      fatture: [
        { direzione: "out", descrizione: "Fattura cliente evento", importo: 5200 },
        { direzione: "in", descrizione: "Sax Live Andrea", importo: 1200 },
        { direzione: "in", descrizione: "Mobile Bar", importo: 1300 },
      ],
    },
    {
      titolo: "Festival Vallemaggia Warmup",
      tipo: "public",
      cliente_id: clienti.comune,
      location_id: loc.maggia,
      stato_plan: "to_plan",
      data_evento: addDays(70),
      lat: 46.247,
      lng: 8.708,
      budget: 20000,
      ricavo: 32000,
      fornitori: [
        { id: forn.djLuma, ruolo: "Warmup set", stato: "da_contattare", costo: 1800 },
        { id: forn.locationPartner, ruolo: "Area partner", stato: "in_trattativa", costo: 2000 },
      ],
      tasks: [
        { titolo: "Accordo con festival", stato: "da_fare" },
        { titolo: "Budget preliminare", stato: "in_corso" },
      ],
    },
  ];

  for (const ev of EVENTI) {
    const eventoId = await getOrCreate("ev_eventi", "titolo", ev.titolo, siteId, {
      titolo: ev.titolo,
      tipo_evento: ev.tipo,
      categoria_prodotto: ev.tipo === "pvt" ? "pvt_event" : "public_event",
      cliente_id: ev.cliente_id,
      location_id: ev.location_id,
      stato_plan: ev.stato_plan,
      stato_accounting: ev.stato_accounting ?? null,
      data_evento: ev.data_evento,
      lat: ev.lat,
      lng: ev.lng,
      budget_previsto: ev.budget,
      ricavo_previsto: ev.ricavo,
    });

    // Fornitori collegati (skip se già presenti per questo evento)
    const { data: existingLinks } = await supabase
      .from("ev_eventi_fornitori")
      .select("fornitore_id")
      .eq("site_id", siteId)
      .eq("evento_id", eventoId);
    const linked = new Set((existingLinks || []).map((l) => l.fornitore_id));
    for (const f of ev.fornitori) {
      if (linked.has(f.id)) continue;
      await supabase.from("ev_eventi_fornitori").insert({
        site_id: siteId,
        evento_id: eventoId,
        fornitore_id: f.id,
        ruolo: f.ruolo,
        stato_ingaggio: f.stato,
        costo: f.costo,
      });
    }

    // Task (skip se l'evento ha già task)
    const { data: existingTasks } = await supabase
      .from("ev_eventi_task")
      .select("id")
      .eq("site_id", siteId)
      .eq("evento_id", eventoId)
      .limit(1);
    if (!existingTasks || existingTasks.length === 0) {
      for (const t of ev.tasks) {
        await supabase.from("ev_eventi_task").insert({
          site_id: siteId,
          evento_id: eventoId,
          titolo: t.titolo,
          stato: t.stato,
        });
      }
    }

    // Fatture (skip se l'evento ha già fatture)
    if (ev.fatture && ev.fatture.length > 0) {
      const { data: existingFatture } = await supabase
        .from("ev_fatture")
        .select("id")
        .eq("site_id", siteId)
        .eq("evento_id", eventoId)
        .limit(1);
      if (!existingFatture || existingFatture.length === 0) {
        for (const fa of ev.fatture) {
          await supabase.from("ev_fatture").insert({
            site_id: siteId,
            evento_id: eventoId,
            direzione: fa.direzione,
            descrizione: fa.descrizione,
            importo: fa.importo,
            stato: fa.direzione === "out" ? "incassata" : "pagata",
          });
        }
      }
    }
  }
  console.log(`✓ ${EVENTI.length} eventi demo`);

  console.log("\n✅ Seed Momentum completato.");
  console.log(`   Spazio: ${SUBDOMAIN} (site_id ${siteId})`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
