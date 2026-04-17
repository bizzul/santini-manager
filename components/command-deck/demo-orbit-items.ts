import { makeInitials, type OrbitItem } from "./orbit-items";

/**
 * Demo orbit items — used ONLY as a fallback when the corresponding real
 * category is empty for the current site. As soon as real entities are
 * inserted (clienti, fornitori, prodotti, …) the demo set is dropped.
 *
 * Each category has 6–10 items with realistic italian naming that fits
 * the Santini SA context (architettura / industria / costruzioni).
 *
 * No image URLs are used: keeping everything to initials avoids loading
 * placeholder assets and keeps the visual language consistent with the
 * most likely real-data state (e.g. Clienti has no logo field, Projects
 * has no image at all).
 */

function demo(
  idPrefix: string,
  entries: Array<{ label: string; category?: string; color?: string }>,
): OrbitItem[] {
  return entries.map((entry, idx) => ({
    id: `${idPrefix}-demo-${idx + 1}`,
    label: entry.label,
    initials: makeInitials(entry.label),
    imageUrl: null,
    category: entry.category ?? null,
    color: entry.color ?? null,
  }));
}

const DEMO_CLIENTI: OrbitItem[] = demo("clienti", [
  { label: "AMP Automotive", category: "Business" },
  { label: "Benedetti Design", category: "Business" },
  { label: "Cerutti S.p.A.", category: "Business" },
  { label: "Delta Industries", category: "Business" },
  { label: "Edile Moderna", category: "Business" },
  { label: "Forma Design", category: "Business" },
  { label: "Groove Architects", category: "Studio" },
  { label: "Hilti Svizzera", category: "Business" },
]);

const DEMO_FORNITORI: OrbitItem[] = demo("fornitori", [
  { label: "Rossi Metalli", category: "Metalli" },
  { label: "Bianchi Vernici", category: "Chimica" },
  { label: "Lombarda Pack", category: "Imballaggio" },
  { label: "TechGlass Lab", category: "Vetro" },
  { label: "Alpina Transport", category: "Logistica" },
  { label: "ABB Robotics", category: "Automazione" },
  { label: "Schneider Electric", category: "Elettrico" },
]);

const DEMO_PRODOTTI: OrbitItem[] = demo("prodotti", [
  { label: "Pannello P-120", category: "Pannelli", color: "#67e8f9" },
  { label: "Modulo M-240", category: "Moduli", color: "#67e8f9" },
  { label: "Cover Slim", category: "Cover", color: "#a5b4fc" },
  { label: "Frame A-8", category: "Strutture", color: "#a5b4fc" },
  { label: "Base Plus", category: "Basi", color: "#6ee7b7" },
  { label: "Top Glass", category: "Vetri", color: "#6ee7b7" },
  { label: "Junction K1", category: "Giunti", color: "#fde68a" },
  { label: "Arm Dynamic", category: "Meccanica", color: "#fca5a5" },
  { label: "Cable X", category: "Cablaggio", color: "#c4b5fd" },
  { label: "Inserto Hex", category: "Minuteria", color: "#f0abfc" },
]);

const DEMO_PROGETTI: OrbitItem[] = demo("progetti", [
  { label: "Torre Milano 2026", category: "In corso" },
  { label: "Villa Lugano", category: "In corso" },
  { label: "Parking Bolzano", category: "In corso" },
  { label: "Ospedale Bergamo", category: "Offerta" },
  { label: "Campus Genova", category: "In corso" },
  { label: "Hotel Roma Sud", category: "In corso" },
  { label: "Museo Zurigo", category: "Offerta" },
  { label: "Centro Parma", category: "In corso" },
  { label: "Tunnel Mentone", category: "Completato" },
]);

const DEMO_INVENTARIO: OrbitItem[] = demo("inventario", [
  { label: "Vite M6 × 20", category: "Viteria" },
  { label: "Dado M8", category: "Viteria" },
  { label: "Piastra 200×200", category: "Piastre" },
  { label: "Profilo 40×40", category: "Profili" },
  { label: "Rivetto 4.8", category: "Viteria" },
  { label: "Cover A", category: "Cover" },
  { label: "Cover B", category: "Cover" },
  { label: "Tubo 1/2\"", category: "Tubazioni" },
  { label: "Isolante 25mm", category: "Isolanti" },
]);

const DEMO_FABBRICA: OrbitItem[] = demo("fabbrica", [
  { label: "Taglio", category: "Produzione", color: "#fca5a5" },
  { label: "Piegatura", category: "Produzione", color: "#fde68a" },
  { label: "Saldatura", category: "Produzione", color: "#fca5a5" },
  { label: "Verniciatura", category: "Produzione", color: "#a5b4fc" },
  { label: "Assemblaggio", category: "Produzione", color: "#6ee7b7" },
  { label: "Controllo Qualità", category: "QC", color: "#67e8f9" },
  { label: "Imballaggio", category: "Logistica", color: "#c4b5fd" },
]);

const DEMO_ADMIN: OrbitItem[] = demo("admin", [
  { label: "Matteo Paolocci", category: "superadmin" },
  { label: "Lisa Ferrari", category: "admin" },
  { label: "Davide Rossi", category: "manager" },
  { label: "Giulia Bianchi", category: "user" },
  { label: "Marco Verdi", category: "user" },
  { label: "Anna Conti", category: "user" },
]);

/** Node id → demo orbit items (used only as fallback when real data is empty). */
export const DEMO_ORBIT_ITEMS: Record<string, OrbitItem[]> = {
  clienti: DEMO_CLIENTI,
  fornitori: DEMO_FORNITORI,
  prodotti: DEMO_PRODOTTI,
  progetti: DEMO_PROGETTI,
  inventario: DEMO_INVENTARIO,
  fabbrica: DEMO_FABBRICA,
  admin: DEMO_ADMIN,
};
