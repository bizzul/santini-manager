type KanbanDateSource = {
  is_production_kanban?: boolean | null;
  identifier?: string | null;
  title?: string | null;
} | null | undefined;

type TaskDateSource = {
  deliveryDate?: string | null;
  produzione_data_fine?: string | null;
  termine_produzione?: string | null;
};

const INSTALLATION_KANBAN_PATTERN = /posa|install|montaggio|cantiere/;

/**
 * Kanban di produzione (officina) che mostrano la fine produzione sulle card.
 * Il Kanban Posa puo' essere marcato `is_production_kanban` ma resta sulla
 * data di posa.
 */
export function usesProductionEndDate(kanban: KanbanDateSource): boolean {
  if (!kanban?.is_production_kanban) return false;
  const label = `${kanban.identifier ?? ""} ${kanban.title ?? ""}`.toLowerCase();
  return !INSTALLATION_KANBAN_PATTERN.test(label);
}

/** Data mostrata sulla card Kanban (e usata per il badge di urgenza). */
export function getKanbanCardDate(task: TaskDateSource, kanban: KanbanDateSource): string | null {
  if (usesProductionEndDate(kanban)) {
    return task.produzione_data_fine || task.termine_produzione || null;
  }
  return task.deliveryDate || null;
}
