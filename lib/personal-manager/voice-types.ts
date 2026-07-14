/** Tipi Voice-First per il Manager Personale (prefisso pm_). */

import type { AreaSlug } from "@/lib/personal-manager/types";

export type PmVoiceNoteStatus =
  | "pending"
  | "transcribing"
  | "processing"
  | "ready"
  | "error";

export type PmVoiceNote = {
  id: string;
  user_id: string;
  area_slug: AreaSlug | null;
  status: PmVoiceNoteStatus;
  audio_path: string | null;
  transcription: string | null;
  summary: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PmEntityType = "progetto" | "persona" | "azienda";

export type PmEntity = {
  id: string;
  user_id: string;
  name: string;
  type: PmEntityType;
  aliases: string[];
  area_slug: AreaSlug | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PmChecklistItem = {
  id: string;
  user_id: string;
  voice_note_id: string;
  entity_id: string | null;
  label: string;
  done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pm_entities?: Pick<PmEntity, "id" | "name" | "type"> | null;
};

export type PmVoiceNoteWithChecklist = PmVoiceNote & {
  pm_checklist_items: PmChecklistItem[];
};

/** Tile riepilogo: area Wheel + punteggio. */
export type FocusAreaTile = {
  id: string;
  slug: AreaSlug;
  nome: string;
  colore: string;
  punteggio: number | null;
  ordine: number;
};
