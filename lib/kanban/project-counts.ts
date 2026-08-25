export type KanbanProjectCountRow = {
  kanbanId?: number | string | null;
};

export function tallyProjectsByKanbanId(
  rows: Array<KanbanProjectCountRow | null | undefined>,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (row?.kanbanId == null || row.kanbanId === "") continue;
    const key = String(row.kanbanId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function withProjectCounts<T extends { id?: number | string | null }>(
  kanbans: T[],
  counts: Map<string, number>,
): Array<T & { projectCount: number }> {
  return kanbans.map((kanban) => ({
    ...kanban,
    projectCount:
      kanban.id == null ? 0 : (counts.get(String(kanban.id)) ?? 0),
  }));
}
