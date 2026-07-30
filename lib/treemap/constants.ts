export const TICINO_MAP_CENTER: [number, number] = [46.2264, 8.772];
export const TICINO_MAP_ZOOM = 9;
export const TICINO_MAX_BOUNDS: [[number, number], [number, number]] = [
  [45.81914, 8.38342],
  [46.63376, 9.16058],
];
export const TICINO_MIN_ZOOM = 8;
export const TICINO_MAX_ZOOM = 18;

export const TM_SALUTE_COLORS: Record<string, string> = {
  VERDE: "#10B981",
  GIALLO: "#F59E0B",
  ROSSO: "#EF4444",
  OFFLINE: "#6B7280",
  SCONOSCIUTO: "#D1D5DB",
};

/** Colori su mappa: più contrasto rispetto alle tile OSM (es. SCONOSCIUTO → rosso) */
export const TM_MAP_MARKER_COLORS: Record<string, string> = {
  VERDE: "#10B981",
  GIALLO: "#F59E0B",
  ROSSO: "#EF4444",
  OFFLINE: "#6B7280",
  SCONOSCIUTO: "#EF4444",
};

export const TM_MAP_MARKER_SIZE_PX = 22;

export const TM_SALUTE_LABELS: Record<string, string> = {
  VERDE: "Verde",
  GIALLO: "Giallo",
  ROSSO: "Rosso",
  OFFLINE: "Offline",
  SCONOSCIUTO: "Sconosciuto",
};

export const TM_SENSOR_TYPES = [
  "DENDROMETRO",
  "SAP_FLOW",
  "UMIDITA_SUOLO",
  "UMIDITA_CHIOMA",
  "POTENZIALE_IDRICO",
  "UMIDITA_FOGLIARE",
  "PAR",
  "INCLINOMETRO",
  "CONDUCIBILITA_LEGNO",
  "MICROCLIMA",
] as const;

export type TmSensorType = (typeof TM_SENSOR_TYPES)[number];
export type TmStatoSalute = keyof typeof TM_SALUTE_COLORS;

export const TM_SENSOR_LABELS: Record<TmSensorType, string> = {
  DENDROMETRO: "Dendrometro",
  SAP_FLOW: "Flusso linfa",
  UMIDITA_SUOLO: "Umidità suolo",
  UMIDITA_CHIOMA: "Umidità chioma",
  POTENZIALE_IDRICO: "Potenziale idrico",
  UMIDITA_FOGLIARE: "Umidità fogliare",
  PAR: "PAR",
  INCLINOMETRO: "Inclinometro",
  CONDUCIBILITA_LEGNO: "Conducibilità legno",
  MICROCLIMA: "Microclima",
};

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
