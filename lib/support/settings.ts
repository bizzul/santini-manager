/**
 * Client-safe constants for the per-site technical support widget.
 * Do not import server supabase from this file.
 */

export const SUPPORT_BOT_SETTING_KEY = "support_bot_enabled";

export const SUPPORT_OPEN_EVENT = "open-support-widget";

export const SUPPORT_RANK_MIN = 0.08;
export const SUPPORT_TRGM_MIN = 0.4;

export const SUPPORT_TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed",
] as const;

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const SUPPORT_SOURCES = ["widget", "error_boundary", "admin"] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];
export type SupportSource = (typeof SUPPORT_SOURCES)[number];

export function parseSupportBotEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  if (
    value &&
    typeof value === "object" &&
    "enabled" in (value as Record<string, unknown>)
  ) {
    return Boolean((value as { enabled?: unknown }).enabled);
  }
  return false;
}

export function formatTicketNumber(publicNumber: number): string {
  return `SUP-${publicNumber}`;
}

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Aperto",
  in_progress: "In lavorazione",
  waiting_user: "In attesa utente",
  resolved: "Risolto",
  closed: "Chiuso",
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  low: "Bassa",
  normal: "Normale",
  high: "Alta",
  urgent: "Urgente",
};

export function isUsefulKbHit(rank: number, trgmSim: number): boolean {
  return rank >= SUPPORT_RANK_MIN || trgmSim >= SUPPORT_TRGM_MIN;
}
