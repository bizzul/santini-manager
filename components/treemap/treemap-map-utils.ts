import type { TmStatoSalute } from "@/lib/treemap/constants";
import { TM_MAP_MARKER_COLORS, TM_SALUTE_COLORS } from "@/lib/treemap/constants";

export const TM_MARKER_Z_INDEX: Record<TmStatoSalute, number> = {
  VERDE: 100,
  SCONOSCIUTO: 150,
  GIALLO: 200,
  OFFLINE: 300,
  ROSSO: 400,
};

export function markerDotHtml(options: {
  color: string;
  selected: boolean;
  offlinePartial: boolean;
  ariaLabel: string;
}): string {
  const { color, selected, offlinePartial, ariaLabel } = options;
  const selectedRing = selected
    ? "box-shadow:0 0 0 3px rgba(59,130,246,0.85);"
    : "";
  const offlineRing = offlinePartial
    ? "outline:2px dashed #6B7280;outline-offset:3px;"
    : "";

  return `<div class="treemap-marker-dot" role="button" tabindex="0" aria-label="${ariaLabel}" style="background:${color};${selectedRing}${offlineRing}"></div>`;
}

export { TM_SALUTE_COLORS, TM_MAP_MARKER_COLORS };
