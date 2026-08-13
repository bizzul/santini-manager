/** Tinte usate nei riquadri Dashboard/Overview (KPI Offerte Inviate / In trattativa). */
export const DASHBOARD_STATUS_TONE = {
  orange: {
    backgroundColor: "rgba(249, 115, 22, 0.35)",
    borderColor: "rgba(251, 146, 60, 0.7)",
  },
  green: {
    backgroundColor: "rgba(34, 197, 94, 0.35)",
    borderColor: "rgba(74, 222, 128, 0.7)",
  },
} as const;

export type DashboardStatusTone = keyof typeof DASHBOARD_STATUS_TONE;
