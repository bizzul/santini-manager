import { addDays, differenceInCalendarDays, isBefore, setHours, setMinutes, startOfDay } from "date-fns";

/**
 * Mappatura pura `Task` -> eventi di calendario per fase (Produzione, Posa,
 * Service). Unica sorgente per le viste Settimana, Per risorsa e Mese: le
 * viste non devono rileggere i campi data/ora del Task.
 *
 * Solo lettura: nessuna regola qui modifica cio' che viene scritto su `Task`.
 */

export type CalendarPhase = "production" | "installation" | "service";

/**
 * - `scadenza`: marcatore di un giorno (Produzione: fine produzione).
 * - `intervallo`: finestra su piu' giorni di calendario, resa come barra all-day.
 * - `appuntamento`: evento di un solo giorno, con o senza orario.
 */
export type CalendarEventKind = "scadenza" | "intervallo" | "appuntamento";

export interface CalendarTaskSource {
  deliveryDate?: string | null;
  termine_produzione?: string | null;
  produzione_data_inizio?: string | null;
  produzione_data_fine?: string | null;
  produzione_ora_inizio?: string | null;
  produzione_ora_fine?: string | null;
  posa_data_inizio?: string | null;
  posa_data_fine?: string | null;
  posa_ora_inizio?: string | null;
  posa_ora_fine?: string | null;
  service_data_inizio?: string | null;
  service_data_fine?: string | null;
  service_ora_inizio?: string | null;
  service_ora_fine?: string | null;
  ora_inizio?: string | null;
  ora_fine?: string | null;
  /** True se il progetto e' nell'ultima colonna (per posizione) del suo Kanban. */
  isInFinalColumn?: boolean | null;
}

export interface DatedCalendarEvent {
  kind: CalendarEventKind;
  phase: CalendarPhase;
  missingDate: false;
  /** Primo giorno, `yyyy-MM-dd`. */
  startDate: string;
  /** Ultimo giorno (incluso), `yyyy-MM-dd`. */
  endDate: string;
  /**
   * Eventi all-day: mezzanotte del primo giorno -> mezzanotte del giorno dopo
   * l'ultimo (fine esclusiva). Eventi con orario: inizio/fine reali.
   */
  start: Date;
  end: Date;
  allDay: boolean;
  /** Giorni di calendario coperti, estremi inclusi (>= 1). */
  durataGiorni: number;
  /** `HH:mm`, solo informativo per gli eventi all-day. */
  oraInizio: string | null;
  oraFine: string | null;
  /** Evento di un giorno senza fascia oraria completa ("Orario da assegnare"). */
  timePending: boolean;
  /** La data di inizio mancava ed e' stata dedotta dalla data di fine. */
  inferredStart: boolean;
  /** Scadenza passata con progetto non ancora nella colonna finale. */
  inRitardo: boolean;
}

export interface UndatedCalendarEvent {
  kind: "appuntamento";
  phase: CalendarPhase;
  /** Orario presente ma nessuna data: va nel pannello "Da definire". */
  missingDate: true;
  startDate: null;
  endDate: null;
  start: null;
  end: null;
  allDay: false;
  durataGiorni: 0;
  oraInizio: string | null;
  oraFine: string | null;
  timePending: false;
  inferredStart: false;
  inRitardo: false;
}

export type CalendarPhaseEvent = DatedCalendarEvent | UndatedCalendarEvent;

export interface MapTaskToEventsOptions {
  /** Riferimento per "In ritardo"; default: adesso. */
  today?: Date;
}

const FALLBACK_START_HOUR = 8;
const FALLBACK_DURATION_MINUTES = 180;

export function normalizeDateKey(value?: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function normalizeTime(value?: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function dateKeyToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function atTime(dateKey: string, time: string | null, fallbackHour: number): Date {
  const base = dateKeyToLocalDate(dateKey);
  if (!time) return setMinutes(setHours(base, fallbackHour), 0);
  const [hours, minutes] = time.split(":").map(Number);
  return setMinutes(setHours(base, hours), minutes);
}

interface PhaseFields {
  dataInizio: string | null;
  dataFine: string | null;
  oraInizio: string | null;
  oraFine: string | null;
}

function readPhaseFields(task: CalendarTaskSource, phase: CalendarPhase): PhaseFields {
  switch (phase) {
    case "production":
      return {
        dataInizio: null,
        dataFine: normalizeDateKey(
          task.produzione_data_fine || task.termine_produzione || task.produzione_data_inizio
        ),
        oraInizio: normalizeTime(task.produzione_ora_inizio),
        oraFine: normalizeTime(task.produzione_ora_fine),
      };
    case "installation":
      return {
        dataInizio: normalizeDateKey(task.posa_data_inizio),
        dataFine: normalizeDateKey(task.posa_data_fine || task.deliveryDate),
        oraInizio: normalizeTime(task.posa_ora_inizio || task.ora_inizio),
        oraFine: normalizeTime(task.posa_ora_fine || task.ora_fine),
      };
    case "service":
      return {
        dataInizio: normalizeDateKey(task.service_data_inizio),
        dataFine: normalizeDateKey(task.service_data_fine || task.deliveryDate),
        oraInizio: normalizeTime(task.service_ora_inizio || task.ora_inizio),
        oraFine: normalizeTime(task.service_ora_fine || task.ora_fine),
      };
  }
}

/**
 * Restituisce 0 o 1 evento per la fase richiesta.
 *
 * Regole:
 * 1. `data_fine > data_inizio` -> `intervallo` all-day, mai in griglia oraria.
 * 2. Inizio mancante -> evento di un giorno sulla data di fine (e viceversa).
 * 3. Produzione -> `scadenza` su coalesce(produzione_data_fine, termine_produzione).
 * 5. Service con orario ma senza data -> evento `missingDate`.
 */
export function mapTaskToEvents(
  task: CalendarTaskSource,
  fase: CalendarPhase,
  options: MapTaskToEventsOptions = {}
): CalendarPhaseEvent[] {
  const fields = readPhaseFields(task, fase);

  if (!fields.dataInizio && !fields.dataFine) {
    const hasServiceTime = Boolean(
      normalizeTime(task.service_ora_inizio) || normalizeTime(task.service_ora_fine)
    );
    if (fase === "service" && hasServiceTime) {
      return [
        {
          kind: "appuntamento",
          phase: fase,
          missingDate: true,
          startDate: null,
          endDate: null,
          start: null,
          end: null,
          allDay: false,
          durataGiorni: 0,
          oraInizio: normalizeTime(task.service_ora_inizio),
          oraFine: normalizeTime(task.service_ora_fine),
          timePending: false,
          inferredStart: false,
          inRitardo: false,
        },
      ];
    }
    return [];
  }

  const inferredStart = !fields.dataInizio;
  let startDate = (fields.dataInizio || fields.dataFine) as string;
  let endDate = (fields.dataFine || fields.dataInizio) as string;
  if (endDate < startDate) {
    endDate = startDate;
  }
  const durataGiorni =
    differenceInCalendarDays(dateKeyToLocalDate(endDate), dateKeyToLocalDate(startDate)) + 1;

  const allDayRange = () => ({
    start: dateKeyToLocalDate(startDate),
    end: addDays(dateKeyToLocalDate(endDate), 1),
  });

  if (fase === "production") {
    startDate = endDate;
    const today = startOfDay(options.today ?? new Date());
    const deadline = dateKeyToLocalDate(endDate);
    return [
      {
        kind: "scadenza",
        phase: fase,
        missingDate: false,
        startDate,
        endDate,
        ...allDayRange(),
        allDay: true,
        durataGiorni: 1,
        oraInizio: fields.oraInizio,
        oraFine: fields.oraFine,
        timePending: false,
        inferredStart: false,
        inRitardo: isBefore(deadline, today) && task.isInFinalColumn !== true,
      },
    ];
  }

  if (durataGiorni > 1) {
    return [
      {
        kind: "intervallo",
        phase: fase,
        missingDate: false,
        startDate,
        endDate,
        ...allDayRange(),
        allDay: true,
        durataGiorni,
        oraInizio: fields.oraInizio,
        oraFine: fields.oraFine,
        timePending: false,
        inferredStart,
        inRitardo: false,
      },
    ];
  }

  const hasTimeRange = Boolean(fields.oraInizio && fields.oraFine);
  const start = atTime(startDate, hasTimeRange ? fields.oraInizio : null, FALLBACK_START_HOUR);
  let end = hasTimeRange
    ? atTime(startDate, fields.oraFine, FALLBACK_START_HOUR)
    : new Date(start.getTime() + FALLBACK_DURATION_MINUTES * 60_000);
  if (!isBefore(start, end)) {
    end = new Date(start.getTime() + FALLBACK_DURATION_MINUTES * 60_000);
  }

  return [
    {
      kind: "appuntamento",
      phase: fase,
      missingDate: false,
      startDate,
      endDate,
      start,
      end,
      allDay: false,
      durataGiorni: 1,
      oraInizio: fields.oraInizio,
      oraFine: fields.oraFine,
      timePending: !hasTimeRange,
      inferredStart,
      inRitardo: false,
    },
  ];
}

export function taskHasEventsForPhase(task: CalendarTaskSource, fase: CalendarPhase): boolean {
  return mapTaskToEvents(task, fase).length > 0;
}

/**
 * Posizione del primo giorno visibile dentro un evento multi-giorno, per
 * l'etichetta "g 29 di 47". Restituisce null se l'evento non tocca il giorno.
 */
export function getEventDayProgress(
  event: Pick<DatedCalendarEvent, "startDate" | "endDate" | "durataGiorni">,
  visibleDateKey: string
): { giorno: number; totale: number } | null {
  if (visibleDateKey < event.startDate || visibleDateKey > event.endDate) return null;
  const giorno =
    differenceInCalendarDays(dateKeyToLocalDate(visibleDateKey), dateKeyToLocalDate(event.startDate)) + 1;
  return { giorno, totale: event.durataGiorni };
}

export function formatEventDayProgress(
  event: Pick<DatedCalendarEvent, "startDate" | "endDate" | "durataGiorni">,
  visibleDateKey: string
): string | null {
  const progress = getEventDayProgress(event, visibleDateKey);
  return progress ? `g ${progress.giorno} di ${progress.totale}` : null;
}
