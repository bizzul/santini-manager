// Tipi e costanti del dominio "Manager dei Manager" (progetti = spazi).
// Rispecchiano lo schema additivo di supabase/migrations/20260709130000.

import type { KanbanColumnDef } from "@/components/momentum/types";

export type ProjectStage =
  | "alpha"
  | "beta"
  | "client_demo"
  | "active";

export interface ManagerProject {
  id: string;
  site_id: string;
  stage: ProjectStage;
  board_order: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  stage_changed_at: string;
  created_at: string;
  updated_at: string;
}

/** Progetto arricchito con i dati del sito/organizzazione per la board. */
export interface ManagerProjectSummary extends ManagerProject {
  site: {
    name: string;
    subdomain: string | null;
    logo: string | null;
    organization_name: string | null;
  };
  /** Minuti totali registrati sul sito (da manager_project_hours). */
  total_minutes?: number;
  /** Numero collaboratori distinti con ore registrate. */
  collaborators_count?: number;
}

export interface ProjectStageEvent {
  id: string;
  project_id: string;
  from_stage: ProjectStage | null;
  to_stage: ProjectStage;
  changed_by: string | null;
  created_at: string;
}

/**
 * Colonne della board progetti, nell'ordine del ciclo di vita:
 * alpha → beta → demo cliente → attivo. Stesse etichette delle categorie
 * storiche di /sites/select ("custom" → "Demo clienti").
 * Compatibili con MomentumKanban (KanbanColumnDef).
 */
export const PROJECT_STAGE_COLUMNS: KanbanColumnDef[] = [
  { id: "alpha", title: "Demo alpha", color: "#a855f7" },
  { id: "beta", title: "Demo beta", color: "#0ea5e9" },
  { id: "client_demo", title: "Demo clienti", color: "#f59e0b" },
  { id: "active", title: "Utenti attivi", color: "#16a34a" },
];

/** Stage non mostrati come colonna nella board principale. */
export const HIDDEN_PROJECT_STAGES: ProjectStage[] = [];

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  alpha: "Demo alpha",
  beta: "Demo beta",
  client_demo: "Demo clienti",
  active: "Utenti attivi",
};
