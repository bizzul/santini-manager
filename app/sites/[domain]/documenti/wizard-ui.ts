/**
 * Token grafici del wizard offerta.
 *
 * Un solo posto per colori, bordi e raggi del mockup approvato: ogni
 * schermata del modulo Documenti li importa da qui invece di ripetere
 * classi. I colori veri stanno nelle variabili --ow-* di globals.css, con
 * valori diversi per tema chiaro e scuro, cosi' il mockup (nato scuro)
 * resta leggibile anche in chiaro.
 */

export const OW = {
  /** Contenitore principale di una sezione (Cliente, Oggetto, Righe...). */
  card: "rounded-[14px] border border-[var(--ow-border)] bg-[var(--ow-card)] p-5",
  cardFlush:
    "overflow-hidden rounded-[14px] border border-[var(--ow-border)] bg-[var(--ow-card)]",
  cardHead:
    "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ow-border)] bg-[var(--ow-card-head)] px-5 py-3.5",
  cardTitle: "text-[15px] font-semibold tracking-[0.2px] text-[var(--ow-text)]",
  cardHint: "text-xs text-[var(--ow-text-3)]",
  divider: "border-t border-[var(--ow-border-soft)]",

  /** Etichetta sopra un campo. */
  label: "mb-1.5 block text-xs font-normal text-[var(--ow-text-2)]",
  /** Etichetta corta in maiuscoletto (griglia posizioni). */
  miniLabel:
    "mb-1 block text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--ow-text-3)]",

  /** Campi: input, textarea, select trigger. */
  input:
    "rounded-[9px] border-[var(--ow-input-border)] bg-[var(--ow-input-bg)] text-[var(--ow-text)] placeholder:text-[var(--ow-text-3)] focus-visible:ring-[var(--ow-accent)]",
  inputSm:
    "h-8 rounded-[7px] border-[var(--ow-input-border)] bg-[var(--ow-input-bg)] px-2 text-[13px] text-[var(--ow-text)] placeholder:text-[var(--ow-text-3)] focus-visible:ring-[var(--ow-accent)]",
  inputReadonly:
    "h-8 rounded-[7px] border-[var(--ow-border-soft)] bg-transparent px-2 text-right text-[14px] font-semibold text-[var(--ow-text)]",
  /** Testo descrittivo base del prodotto: tratteggiato, a bassa enfasi. */
  baseArea:
    "min-h-[4.5rem] resize-y rounded-lg border border-dashed border-[var(--ow-base-border)] bg-[var(--ow-base-bg)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--ow-text-2)] placeholder:text-[var(--ow-text-3)] focus-visible:ring-[var(--ow-accent)]",

  /** Scheda di una singola posizione. */
  posCard:
    "rounded-[11px] border border-[var(--ow-pos-border)] bg-[var(--ow-pos-bg)] p-4",
  posIndex:
    "flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--ow-card-head)] px-1.5 text-[11px] font-semibold text-[var(--ow-text-3)]",

  /** Riquadro selezionabile (categorie). */
  tile: "flex cursor-pointer gap-3 rounded-[11px] border border-[var(--ow-tile-border)] bg-[var(--ow-tile-bg)] p-3.5 transition-colors hover:border-[var(--ow-tile-active-border)]",
  tileActive:
    "flex cursor-pointer gap-3 rounded-[11px] border border-[var(--ow-tile-active-border)] bg-[var(--ow-tile-active-bg)] p-3.5 transition-colors",

  /** Avviso informativo azzurro in testa a un passo. */
  banner:
    "rounded-[11px] border border-[var(--ow-banner-border)] bg-[var(--ow-banner-bg)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ow-banner-text)]",
  /** Avviso neutro. */
  note: "rounded-[11px] border border-[var(--ow-border)] bg-[var(--ow-card-head)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ow-text-2)]",

  tag: "rounded border border-[var(--ow-banner-border)] bg-[var(--ow-banner-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--ow-accent-text)]",
  tagSuccess:
    "rounded-[5px] bg-[var(--ow-success)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--ow-success-fg)]",
  code: "font-mono text-[11px] text-[var(--ow-text-3)]",

  /** Riquadri avviso sulle posizioni. */
  stopBox:
    "rounded-[7px] border border-[var(--ow-danger-border)] bg-[var(--ow-danger-bg)] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--ow-danger-text)]",
  warnBox:
    "rounded-[7px] border border-[var(--ow-warn-border)] bg-[var(--ow-warn-bg)] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--ow-warn-text)]",
  noteBox:
    "rounded-[7px] border border-[var(--ow-border)] bg-[var(--ow-card-head)] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--ow-text-3)]",
  pillDanger:
    "rounded-md border border-[var(--ow-danger-border)] bg-[var(--ow-danger-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ow-danger-text)]",
  pillWarn:
    "rounded-md border border-[var(--ow-warn-border)] bg-[var(--ow-warn-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ow-warn-text)]",

  /** Bottoni. */
  btnPrimary:
    "rounded-[9px] border border-transparent bg-[var(--ow-accent)] px-5 font-semibold text-[var(--ow-accent-fg)] shadow-none hover:bg-[var(--ow-accent-hover)]",
  btnSecondary:
    "rounded-[9px] border border-[var(--ow-input-border)] bg-transparent px-4 font-medium text-[var(--ow-text-2)] shadow-none hover:bg-[var(--ow-card-head)] hover:text-[var(--ow-text)]",
  btnSmall:
    "h-8 rounded-lg border border-[var(--ow-input-border)] bg-transparent px-3 text-xs font-medium text-[var(--ow-text-2)] shadow-none hover:bg-[var(--ow-card-head)] hover:text-[var(--ow-text)]",
  btnGhostIcon:
    "h-7 w-7 rounded-md text-[var(--ow-text-3)] hover:bg-[var(--ow-card-head)] hover:text-[var(--ow-danger-text)]",

  /** Piede di passo con Indietro / Avanti. */
  footer:
    "flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ow-border)] pt-4",
  footerStep: "text-xs text-[var(--ow-text-3)]",
} as const;

/** Colore del pallino di categoria nell'intestazione delle posizioni. */
export function dotCategoria(categoria: string | null | undefined): string {
  const c = (categoria ?? "").toLowerCase();
  if (c.includes("serram")) return "bg-[var(--ow-dot-serramenti)]";
  if (c.includes("posa")) return "bg-[var(--ow-dot-posa)]";
  if (c.includes("port")) return "bg-[var(--ow-dot-porte)]";
  return "bg-[var(--ow-text-3)]";
}
