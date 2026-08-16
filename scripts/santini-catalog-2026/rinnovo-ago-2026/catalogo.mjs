// Nuovo catalogo Santini (rinnovo ago 2026) — fonte: Prodotti_Santini.docx.
// Modello "Misto": Serramenti = 1 prodotto per variante con griglia propria;
// Porte = 1 prodotto per tipo con telaio/binario come coefficiente;
// Arredamento = 1 prodotto per voce con materiale come coefficiente.

export const SITE_ID = "7ce3bca0-2293-4328-bee3-b8347c581b5b"; // Santini SA

export const TARGET_CATEGORIES = ["Arredamento", "Porte", "Serramenti"];
export const OLD_ARCHIVE_CATEGORY_NAME = "Archivio 2026";
export const ARCHIVE_CATEGORY_NAME = "Archivio ago 2026";

// categoria, codice, nome, sottocategoria, modalita_prezzo, famiglia, cod_tipo_cassone
const S = (code, name, sub, famiglia) => ({
  categoria: "Serramenti",
  internal_code: code,
  name,
  subcategory: sub,
  modalita_prezzo: "griglia",
  famiglia_apertura_cod: famiglia,
});
const P = (code, name, famiglia) => ({
  categoria: "Porte",
  internal_code: code,
  name,
  subcategory: name,
  modalita_prezzo: "griglia",
  famiglia_apertura_cod: famiglia,
});
const A = (code, name, sub, modalita = "mc", extra = {}) => ({
  categoria: "Arredamento",
  internal_code: code,
  name,
  subcategory: sub,
  modalita_prezzo: modalita,
  famiglia_apertura_cod: null,
  ...extra,
});

export const NEW_PRODUCTS = [
  // ---- Serramenti (10) — materiale come coefficiente (materiale_serramento) ----
  S("SER26-FB1A", "Finestra a battente – anta singola", "Finestra a battente", "FIN_BATT_1A"),
  S("SER26-FB2A", "Finestra a battente – anta doppia", "Finestra a battente", "FIN_BATT_2A"),
  S("SER26-FIX", "Finestra fissa", "Finestra a battente", "FIN_FISSA"),
  S("SER26-PF1A", "Porta finestra – anta singola", "Porta finestra", "PF_BATT_1A"),
  S("SER26-PF2A", "Porta finestra – anta doppia", "Porta finestra", "PF_BATT_2A"),
  S("SER26-SCA", "Finestra scorrevole – Schema A", "Finestra scorrevole", "FIN_SCOR_A"),
  S("SER26-SCC", "Finestra scorrevole – Schema C", "Finestra scorrevole", "FIN_SCOR_C"),
  S("SER26-SCK", "Finestra scorrevole – Schema K", "Finestra scorrevole", "FIN_SCOR_K"),
  S("SER26-SCG2", "Finestra scorrevole – Schema G2", "Finestra scorrevole", "FIN_SCOR_G2"),
  S("SER26-SPEC", "Finestra speciale – forma speciale", "Finestra speciale", "FIN_SPEC"),

  // ---- Porte (6) — telaio/binario come coefficiente (telaio) ----
  P("POR26-INT", "Porta interna", "POR_INT"),
  P("POR26-ENT", "Porta d'entrata", "POR_ENT"),
  P("POR26-EST", "Porta esterna", "POR_EST"),
  P("POR26-SCO", "Porta scorrevole", "POR_SCO"),
  P("POR26-TEC", "Porta locale tecnico", "POR_TEC"),
  P("POR26-CAN", "Porta cantina", "POR_CAN"),

  // ---- Arredamento (25) — materiale come coefficiente (materiale_arredamento) ----
  // Armadi: modello cassone esistente (griglia ARM_CASSONE + cod_tipo_cassone)
  A("ARR26-ARM-STD", "Armadio standard", "Armadi", "griglia", {
    famiglia_apertura_cod: "ARM_CASSONE",
    cod_tipo_cassone: "ARM_BATTENTE",
  }),
  A("ARR26-ARM-MURO", "Armadio a muro", "Armadi", "griglia", {
    famiglia_apertura_cod: "ARM_CASSONE",
    cod_tipo_cassone: "ARM_MURO",
  }),
  A("ARR26-ARM-SCO", "Armadio scorrevole", "Armadi", "griglia", {
    famiglia_apertura_cod: "ARM_CASSONE",
    cod_tipo_cassone: "ARM_SCORR2",
  }),
  A("ARR26-ARM-GUA", "Armadio guardaroba", "Armadi", "griglia", {
    famiglia_apertura_cod: "ARM_CASSONE",
    cod_tipo_cassone: "ARM_GUARDAROBA",
  }),
  A("ARR26-BAG-SOSP", "Mobile sospeso", "Bagno"),
  A("ARR26-BAG-SPEC", "Specchiera", "Bagno", "fisso"),
  A("ARR26-BAG-LAV", "Piano lavandino", "Bagno"),
  A("ARR26-LET-LETTO", "Letto", "Camera da letto"),
  A("ARR26-LET-COM", "Comodino", "Camera da letto"),
  A("ARR26-LET-CAS", "Cassettiera", "Camera da letto"),
  A("ARR26-CUC-LIN", "Cucina lineare", "Cucina"),
  A("ARR26-CUC-ANG", "Cucina ad angolo", "Cucina"),
  A("ARR26-CUC-ISO", "Cucina con isola", "Cucina"),
  A("ARR26-CUC-ELE", "Elettrodomestico", "Cucina", "fisso"),
  A("ARR26-LIB-PAR", "Libreria a parete", "Librerie"),
  A("ARR26-LIB-DIV", "Libreria divisoria", "Librerie"),
  A("ARR26-TAV-STD", "Tavolo standard", "Tavoli"),
  A("ARR26-TAV-ALL", "Tavolo allungabile", "Tavoli"),
  A("ARR26-UFF-SCR", "Scrivania", "Ufficio"),
  A("ARR26-UFF-CAS", "Cassettiera", "Ufficio"),
  A("ARR26-UFF-ARC", "Archivio", "Ufficio"),
  A("ARR26-SOG-TV", "Mobile TV", "Soggiorno"),
  A("ARR26-SOG-VET", "Vetrina", "Soggiorno"),
  A("ARR26-SOG-TAV", "Tavolino", "Soggiorno"),
  A("ARR26-SOG-MEN", "Mensola", "Soggiorno"),
];

// Coefficienti da upsert-are (moltiplicatore 1.0, attivo=false: placeholder
// da valorizzare in admin /coefficienti).
export const NEW_COEFFICIENTI = [
  // Materiali serramenti (da docx: PVC, PVC-ALU, ALU, Legno, Legno-ALU)
  { categoria: "materiale_serramento", codice: "PVC", descrizione: "PVC" },
  { categoria: "materiale_serramento", codice: "PAL", descrizione: "PVC-Alluminio" },
  { categoria: "materiale_serramento", codice: "ALU", descrizione: "Alluminio" },
  { categoria: "materiale_serramento", codice: "LEG", descrizione: "Legno" },
  { categoria: "materiale_serramento", codice: "LEA", descrizione: "Legno-Alluminio" },
  // Materiali arredamento (nuova categoria coefficiente)
  { categoria: "materiale_arredamento", codice: "TRC", descrizione: "Pannello truciolato" },
  { categoria: "materiale_arredamento", codice: "MDF", descrizione: "MDF laccato" },
  { categoria: "materiale_arredamento", codice: "LAM", descrizione: "Pannello laminato" },
  { categoria: "materiale_arredamento", codice: "IMP", descrizione: "Pannello impiallacciato" },
  { categoria: "materiale_arredamento", codice: "MAS", descrizione: "Legno massiccio" },
  // Telai porte + binari scorrevoli
  { categoria: "telaio", codice: "CAS", descrizione: "Telaio a cassetta" },
  { categoria: "telaio", codice: "BAI", descrizione: "Telaio a baionetta" },
  { categoria: "telaio", codice: "APP", descrizione: "Telaio applicato" },
  { categoria: "telaio", codice: "BINAPP", descrizione: "Binario applicato" },
  { categoria: "telaio", codice: "BINSOF", descrizione: "Binario a soffitto" },
  { categoria: "telaio", codice: "SCOMP", descrizione: "A scomparsa" },
];

// Placeholder telaio obsoleti (inattivi, x1.0, mai referenziati) da eliminare.
export const OBSOLETE_TELAIO_CODES = ["APL", "CTA", "CTL"];
