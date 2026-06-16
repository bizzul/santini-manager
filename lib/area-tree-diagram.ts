/** Max rows shown inline in a list panel before "+N altri". */
export const AREA_TREE_MAX_ROWS = 8;

export interface AreaTreePanelRow extends Record<string, unknown> {
  id: string;
  label: string;
  badge?: string;
  color?: string;
  onClick?: () => void;
}

export interface AreaTreeListPanel extends Record<string, unknown> {
  id: string;
  title?: string;
  rows: AreaTreePanelRow[];
  moreCount?: number;
  onMore?: () => void;
}

export interface AreaTreeSector extends Record<string, unknown> {
  id: string;
  label: string;
  badge?: string;
  color?: string;
  icon?: string;
  faIcon?: string;
  panels: AreaTreeListPanel[];
}

export interface AreaTreeRoot extends Record<string, unknown> {
  label: string;
  sublabel?: string;
  icon?: string;
  color?: string;
}

export function capPanelRows<T>(
  items: T[],
  mapRow: (item: T) => AreaTreePanelRow,
  onMore?: () => void,
): Pick<AreaTreeListPanel, "rows" | "moreCount" | "onMore"> {
  const visible = items.slice(0, AREA_TREE_MAX_ROWS);
  const moreCount = Math.max(0, items.length - AREA_TREE_MAX_ROWS);
  return {
    rows: visible.map(mapRow),
    moreCount: moreCount > 0 ? moreCount : undefined,
    onMore: moreCount > 0 ? onMore : undefined,
  };
}

export function panelContentHeight(panel: AreaTreeListPanel): number {
  const titleH = panel.title ? 36 : 0;
  const rowsH = panel.rows.length * 32;
  const footerH = panel.moreCount && panel.moreCount > 0 ? 28 : 0;
  return 16 + titleH + rowsH + footerH + 8;
}
