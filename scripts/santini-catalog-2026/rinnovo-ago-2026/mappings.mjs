// Mappatura vecchio prodotto -> nuovo codice (rinnovo ago 2026).
// Le regole lavorano su nome/codice/sottocategoria normalizzati così da
// coprire sia il catalogo 2026 attivo (POR-/SER-/ARR-/ARM-CASSONE-*) sia le
// righe pre-2026 in "Archivio 2026" (codici storici o assenti).
// confidence: exact = corrispondenza diretta; close = parente stretto;
// fallback = "più simile" da rivedere nel report dry-run.

function norm(v) {
  return (v || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Testo normalizzato su cui lavorano le regole: nome + sottocategoria + type
// (nelle righe pre-2026 il segnale vero sta in `type`: "Porta entrata",
// "Scorrevole in PVC", "Pensile", ...).
export function ruleText(p) {
  return norm([p.name, p.subcategory, p.type].filter(Boolean).join(" "));
}

// ---------------------------------------------------------------- dominio
// porte | serramenti | arredo — da codice interno o, in fallback, dal testo.
export function classifyDomain(p) {
  const code = (p.internal_code || "").toUpperCase();
  if (code.startsWith("ZZTEST-POR")) return "porte";
  if (code.startsWith("ZZTEST-GRID")) return "serramenti";
  if (code.startsWith("POR")) return "porte";
  if (code.startsWith("SER")) return "serramenti";
  if (code.startsWith("ARR") || code.startsWith("ARM")) return "arredo";

  const n = ruleText(p);
  if (/porta.?finestra/.test(n)) return "serramenti";
  if (/\bporta\b|\bporte\b|portoncin|blindat/.test(n)) return "porte";
  if (/finestra|serrament|veranda|facciat|lucernar|zanzarier|persian|gelosi|vetrata|alzante/.test(n)) {
    return "serramenti";
  }
  if (/armadio|guardaroba|cucin|pensile|librer|tavol|scrivan|mensol|letto|comodin|cassettier|specchi|vetrin|mobile|panc|sgabell|fiorier|tend|restauro/.test(n)) {
    return "arredo";
  }
  // "Scorrevole in legno/ALU/PVC" senza altre parole chiave = finestra scorrevole
  if (/scorrevole in (legno|alu|pvc)|scorrevol.*\b(alu|pvc)\b/.test(n)) return "serramenti";
  return "arredo";
}

// ---------------------------------------------------------------- porte
function mapPorta(n) {
  if (/cantina/.test(n)) return ["POR26-CAN", "exact"];
  if (/garage|\bbox\b/.test(n)) return ["POR26-CAN", "close"];
  if (/tagliafuoco|\brei\b|ei ?30|ei ?60|insonorizz|fonoisolant|locale tecnico|tecnic/.test(n)) {
    return ["POR26-TEC", /tecnic/.test(n) ? "exact" : "close"];
  }
  if (/scorrevol|scomparsa|a libro|pieghevol/.test(n)) {
    return ["POR26-SCO", /a libro|pieghevol/.test(n) ? "close" : "exact"];
  }
  if (/blindat|entrata|ingresso|portoncin/.test(n)) {
    return ["POR26-ENT", /blindat/.test(n) ? "close" : "exact"];
  }
  if (/cortile|estern/.test(n)) return ["POR26-EST", "exact"];
  if (/interna|battente|filomuro|sopraluce|griglia|bagno|wc/.test(n)) {
    return ["POR26-INT", /battente|interna/.test(n) ? "exact" : "close"];
  }
  if (/vetrat|vetro/.test(n)) return ["POR26-INT", "close"];
  return ["POR26-INT", "fallback"]; // restauro, su misura, resto
}

// ---------------------------------------------------------------- serramenti
function mapSerramento(n) {
  const doppia = /doppia|2 ante|due ante/.test(n);
  if (/porta.?finestra/.test(n)) return [doppia ? "SER26-PF2A" : "SER26-PF1A", "exact"];
  if (/\bfiss/.test(n)) return ["SER26-FIX", "exact"];
  if (/schema a\b/.test(n)) return ["SER26-SCA", "exact"];
  if (/schema c\b/.test(n)) return ["SER26-SCC", "exact"];
  if (/schema k\b/.test(n)) return ["SER26-SCK", "exact"];
  if (/schema g2/.test(n)) return ["SER26-SCG2", "exact"];
  if (/alzante|scorrevol/.test(n)) return ["SER26-SCA", "close"];
  if (/special|bilico|antieffrazione|fonoisolant|tagliafuoco|forma/.test(n)) {
    return ["SER26-SPEC", /special|forma/.test(n) ? "exact" : "close"];
  }
  if (/facciat|verand|lucernar|tetto|sostituzione vetro|riparazion|restauro/.test(n)) {
    return ["SER26-SPEC", "fallback"];
  }
  if (/battente|finestra/.test(n)) {
    return [doppia ? "SER26-FB2A" : "SER26-FB1A", /ribalta/.test(n) ? "close" : "exact"];
  }
  return ["SER26-FB1A", "fallback"]; // su misura, resto
}

// ---------------------------------------------------------------- arredo
const CASSONE_MAP = {
  ARM_BATTENTE: ["ARR26-ARM-STD", "exact"],
  ARM_MURO: ["ARR26-ARM-MURO", "exact"],
  ARM_SCORR2: ["ARR26-ARM-SCO", "exact"],
  ARM_SCORR3: ["ARR26-ARM-SCO", "close"],
  ARM_ANGOLO: ["ARR26-ARM-SCO", "close"],
  ARM_SPECCHIO: ["ARR26-ARM-STD", "close"],
  ARM_CABINA: ["ARR26-ARM-GUA", "close"],
  ARM_GUARDAROBA: ["ARR26-ARM-GUA", "exact"],
};

function mapArredo(n, p) {
  const cassone = (p.cod_tipo_cassone || "").toUpperCase();
  if (CASSONE_MAP[cassone]) return CASSONE_MAP[cassone];
  if (/armadio|cabina armadio|guardaroba/.test(n)) {
    if (/guardaroba|cabina/.test(n)) return ["ARR26-ARM-GUA", "exact"];
    if (/scorrevol/.test(n)) return ["ARR26-ARM-SCO", "exact"];
    if (/muro/.test(n)) return ["ARR26-ARM-MURO", "exact"];
    return ["ARR26-ARM-STD", "close"];
  }
  if (/cucin|pensile|colonna cucina|base cucina|mobile base|\bbase\b.*mobile/.test(n)) {
    if (/elettrodomest|forno|frigo/.test(n)) return ["ARR26-CUC-ELE", "exact"];
    if (/angolo/.test(n)) return ["ARR26-CUC-ANG", "exact"];
    if (/isola|penisola/.test(n)) return ["ARR26-CUC-ISO", /penisola/.test(n) ? "close" : "exact"];
    if (/base|pensile|colonna/.test(n)) return ["ARR26-CUC-LIN", "close"];
    return ["ARR26-CUC-LIN", /linear/.test(n) ? "exact" : "close"];
  }
  if (/elettrodomest/.test(n)) return ["ARR26-CUC-ELE", "exact"];
  if (/letto|testiera/.test(n)) return ["ARR26-LET-LETTO", /testiera/.test(n) ? "close" : "exact"];
  if (/comodin/.test(n)) return ["ARR26-LET-COM", "exact"];
  if (/librer/.test(n)) {
    return [/divisor/.test(n) ? "ARR26-LIB-DIV" : "ARR26-LIB-PAR", "exact"];
  }
  if (/mensol|ripian/.test(n)) return ["ARR26-SOG-MEN", /mensol/.test(n) ? "exact" : "close"];
  if (/scrivan/.test(n)) return ["ARR26-UFF-SCR", "exact"];
  if (/archiv/.test(n)) return ["ARR26-UFF-ARC", "exact"];
  if (/cassettier/.test(n)) {
    // Ufficio se il contesto lo dice, altrimenti camera da letto.
    return [/uffic/.test(n) ? "ARR26-UFF-CAS" : "ARR26-LET-CAS", "close"];
  }
  if (/bagno|lavab|lavandino/.test(n)) {
    if (/specchi/.test(n)) return ["ARR26-BAG-SPEC", "exact"];
    if (/lavab|lavandino/.test(n)) return ["ARR26-BAG-LAV", "exact"];
    if (/sospeso/.test(n)) return ["ARR26-BAG-SOSP", "exact"];
    return ["ARR26-BAG-SOSP", "close"]; // mobile bagno a terra ecc.
  }
  if (/specchi/.test(n)) return ["ARR26-BAG-SPEC", "close"];
  if (/tavolino/.test(n)) return ["ARR26-SOG-TAV", "exact"];
  if (/tavol/.test(n)) {
    return [/allungab/.test(n) ? "ARR26-TAV-ALL" : "ARR26-TAV-STD", "exact"];
  }
  if (/\btv\b|porta tv|mobile tv/.test(n)) return ["ARR26-SOG-TV", "exact"];
  if (/vetrin/.test(n)) return ["ARR26-SOG-VET", "exact"];
  if (/\bmobile sospeso\b/.test(n)) return ["ARR26-BAG-SOSP", "exact"];
  if (/panc|sgabell|sedut|sedia/.test(n)) return ["ARR26-TAV-STD", "fallback"];
  if (/tend|cassonetto/.test(n)) return ["ARR26-SOG-MEN", "fallback"];
  // esterno, restauro, riverniciatura, su misura generico, resto
  return ["ARR26-TAV-STD", "fallback"];
}

/**
 * Mappa un vecchio prodotto sul codice del nuovo catalogo.
 * @returns {{ target: string, confidence: "exact"|"close"|"fallback", domain: string }}
 */
export function mapOldProduct(p) {
  const domain = classifyDomain(p);
  const n = ruleText(p);
  const [target, confidence] =
    domain === "porte" ? mapPorta(n)
    : domain === "serramenti" ? mapSerramento(n)
    : mapArredo(n, p);
  return { target, confidence, domain };
}
