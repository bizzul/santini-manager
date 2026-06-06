import { cn } from "@/lib/utils";

export type TableColumnRole =
  | "leading"
  | "code"
  | "name"
  | "nameNarrow"
  | "descriptionFlex"
  | "metric"
  | "metricWide"
  | "currency"
  | "actions"
  | "actionsCompact"
  | "textFixed"
  | "dimension";

export interface TableColumnDef {
  id: string;
  header: string;
  role: TableColumnRole;
  width?: string;
  headerClassName?: string;
}

/** Larghezza colonna Nome nelle tabelle gerarchiche (7rem). */
export const HIERARCHY_NAME_WIDTH = "7rem";

/** Max larghezza Descrizione = 6× Nome. */
export const HIERARCHY_DESCRIPTION_MAX_WIDTH = "42rem";

/** Spazio per indent + freccia (2rem) + thumbnail (2.5rem). */
export const HIERARCHY_LEADING_WIDTH = "9rem";

const DENSE_BASE = "!p-0";

const ROLE_CELL_CLASSES: Record<TableColumnRole, string> = {
  leading: cn(
    DENSE_BASE,
    "w-[9rem] max-w-[9rem] shrink-0 px-2 py-2 align-middle",
  ),
  code: cn(
    DENSE_BASE,
    "w-[3.5rem] max-w-[3.5rem] shrink-0 px-2 py-2 align-middle truncate",
  ),
  name: cn(
    DENSE_BASE,
    "w-[7rem] max-w-[7rem] shrink-0 px-2 py-2 align-middle truncate font-medium",
  ),
  nameNarrow: cn(
    DENSE_BASE,
    "w-[8rem] max-w-[8rem] shrink-0 px-2 py-2 align-middle truncate font-medium",
  ),
  descriptionFlex: cn(
    DENSE_BASE,
    "min-w-[8rem] max-w-[42rem] px-2 py-2 align-middle whitespace-normal break-words",
  ),
  metric: cn(
    DENSE_BASE,
    "w-[3rem] max-w-[3rem] shrink-0 px-1.5 py-2 text-center align-middle tabular-nums",
  ),
  metricWide: cn(
    DENSE_BASE,
    "w-[4rem] max-w-[4rem] shrink-0 px-1.5 py-2 text-center align-middle tabular-nums",
  ),
  currency: cn(
    DENSE_BASE,
    "w-[6.5rem] max-w-[6.5rem] shrink-0 px-2 py-2 text-right align-middle tabular-nums font-medium",
  ),
  actions: cn(
    DENSE_BASE,
    "w-[5.5rem] max-w-[5.5rem] shrink-0 px-2 py-2 text-right align-middle",
  ),
  actionsCompact: cn(
    DENSE_BASE,
    "w-[3rem] max-w-[3rem] shrink-0 px-1 py-2 text-center align-middle",
  ),
  textFixed: cn(
    DENSE_BASE,
    "shrink-0 px-2 py-2 align-middle truncate",
  ),
  dimension: cn(
    DENSE_BASE,
    "w-[3.25rem] max-w-[3.25rem] shrink-0 px-1 py-2 text-center align-middle tabular-nums overflow-hidden",
  ),
};

const ROLE_HEAD_CLASSES: Record<TableColumnRole, string> = {
  leading: cn(
    DENSE_BASE,
    "w-[9rem] max-w-[9rem] shrink-0 px-2 py-2 h-auto",
  ),
  code: cn(
    DENSE_BASE,
    "w-[3.5rem] max-w-[3.5rem] shrink-0 px-2 py-2 h-auto",
  ),
  name: cn(
    DENSE_BASE,
    "w-[7rem] max-w-[7rem] shrink-0 px-2 py-2 h-auto",
  ),
  nameNarrow: cn(
    DENSE_BASE,
    "w-[8rem] max-w-[8rem] shrink-0 px-2 py-2 h-auto",
  ),
  descriptionFlex: cn(
    DENSE_BASE,
    "min-w-[8rem] max-w-[42rem] px-2 py-2 h-auto",
  ),
  metric: cn(
    DENSE_BASE,
    "w-[3rem] max-w-[3rem] shrink-0 px-1.5 py-2 h-auto text-center",
  ),
  metricWide: cn(
    DENSE_BASE,
    "w-[4rem] max-w-[4rem] shrink-0 px-1.5 py-2 h-auto text-center",
  ),
  currency: cn(
    DENSE_BASE,
    "w-[6.5rem] max-w-[6.5rem] shrink-0 px-2 py-2 h-auto text-right",
  ),
  actions: cn(
    DENSE_BASE,
    "w-[5.5rem] max-w-[5.5rem] shrink-0 px-2 py-2 h-auto text-right",
  ),
  actionsCompact: cn(
    DENSE_BASE,
    "w-[3rem] max-w-[3rem] shrink-0 px-1 py-2 h-auto text-center",
  ),
  textFixed: cn(DENSE_BASE, "shrink-0 px-2 py-2 h-auto"),
  dimension: cn(
    DENSE_BASE,
    "w-[3.25rem] max-w-[3.25rem] shrink-0 px-1 py-2 h-auto text-center",
  ),
};

export const SELL_HIERARCHY_SUMMARY_COLUMNS: TableColumnDef[] = [
  { id: "leading", header: "", role: "leading", width: HIERARCHY_LEADING_WIDTH },
  { id: "name", header: "Categoria", role: "name", width: HIERARCHY_NAME_WIDTH },
  {
    id: "description",
    header: "Descrizione",
    role: "descriptionFlex",
    width: HIERARCHY_DESCRIPTION_MAX_WIDTH,
  },
  { id: "products", header: "Art.", role: "metric", width: "3rem" },
  { id: "subcategories", header: "S.cat", role: "metric", width: "3rem" },
  { id: "pieces", header: "Pz.", role: "metricWide", width: "4rem" },
  { id: "actions", header: "Azioni", role: "actions", width: "5.5rem" },
];

export const HIERARCHY_SUMMARY_COLUMNS: TableColumnDef[] = [
  { id: "leading", header: "", role: "leading", width: HIERARCHY_LEADING_WIDTH },
  { id: "code", header: "Codice", role: "code", width: "3.5rem" },
  { id: "name", header: "Categoria", role: "name", width: HIERARCHY_NAME_WIDTH },
  {
    id: "description",
    header: "Descrizione",
    role: "descriptionFlex",
    width: HIERARCHY_DESCRIPTION_MAX_WIDTH,
  },
  { id: "articles", header: "Art.", role: "metric", width: "3rem" },
  { id: "subcategories", header: "S.cat", role: "metric", width: "3rem" },
  { id: "pieces", header: "Pz.", role: "metricWide", width: "4rem" },
  { id: "value", header: "Valore", role: "currency", width: "6.5rem" },
  { id: "actions", header: "Azioni", role: "actions", width: "5.5rem" },
];

export const INVENTORY_ARTICLES_DENSE_COLUMNS: TableColumnDef[] = [
  { id: "internal_code", header: "Cod.", role: "code", width: "3.5rem" },
  { id: "name", header: "Nome", role: "nameNarrow", width: "8rem" },
  {
    id: "color",
    header: "Colore",
    role: "textFixed",
    width: "4.5rem",
  },
  {
    id: "supplier",
    header: "Fornitore",
    role: "textFixed",
    width: "8rem",
  },
  { id: "width", header: "Larg.", role: "dimension", width: "3.25rem" },
  { id: "height", header: "Alt.", role: "dimension", width: "3.25rem" },
  { id: "length", header: "Lung.", role: "dimension", width: "3.25rem" },
  { id: "thickness", header: "Sp.", role: "dimension", width: "3.25rem" },
  { id: "diameter", header: "Ø", role: "dimension", width: "3.25rem" },
  { id: "quantity", header: "Pz.", role: "metricWide", width: "4rem" },
  {
    id: "purchase_unit_price",
    header: "P. Acquisto",
    role: "currency",
    width: "5.5rem",
  },
  { id: "total_price", header: "Totale", role: "currency", width: "6rem" },
  { id: "actions", header: "Azioni", role: "actionsCompact", width: "3rem" },
];

const INVENTORY_ARTICLES_COMPACT_EXTRA_COLUMNS: TableColumnDef[] = [
  { id: "subcategory", header: "Sottocategoria", role: "textFixed", width: "7.5rem" },
];

const INVENTORY_ARTICLES_DRILLDOWN_EXTRA_COLUMNS: TableColumnDef[] = [
  { id: "subcategory", header: "Categoria", role: "textFixed", width: "7.5rem" },
];

export const INVENTORY_ARTICLES_DRILLDOWN_COLUMNS: TableColumnDef[] = [
  { id: "internal_code", header: "Cod.", role: "code", width: "3.5rem" },
  ...INVENTORY_ARTICLES_DRILLDOWN_EXTRA_COLUMNS,
  ...INVENTORY_ARTICLES_DENSE_COLUMNS.filter(
    (column) => column.id !== "internal_code",
  ),
];

const SELL_PRODUCTS_DRILLDOWN_EXTRA_COLUMNS: TableColumnDef[] = [
  { id: "subcategory", header: "Categoria", role: "textFixed", width: "7.5rem" },
];

export const SELL_PRODUCTS_DENSE_COLUMNS: TableColumnDef[] = [
  { id: "internal_code", header: "Cod.", role: "code", width: "3.5rem" },
  { id: "tipo", header: "Tipo", role: "textFixed", width: "5rem" },
  { id: "name", header: "Nome", role: "nameNarrow", width: "8rem" },
  {
    id: "description",
    header: "Descrizione",
    role: "descriptionFlex",
    width: HIERARCHY_DESCRIPTION_MAX_WIDTH,
  },
  { id: "supplier", header: "Fornitore", role: "textFixed", width: "8rem" },
  {
    id: "price_list",
    header: "Listino",
    role: "currency",
    width: "5.5rem",
  },
  { id: "doc_url", header: "Scheda", role: "actionsCompact", width: "3rem" },
  { id: "actions", header: "Azioni", role: "actionsCompact", width: "3rem" },
];

export const SELL_PRODUCTS_DRILLDOWN_COLUMNS: TableColumnDef[] = [
  { id: "internal_code", header: "Cod.", role: "code", width: "3.5rem" },
  ...SELL_PRODUCTS_DRILLDOWN_EXTRA_COLUMNS,
  ...SELL_PRODUCTS_DENSE_COLUMNS.filter(
    (column) => column.id !== "internal_code",
  ),
];

const TEXT_FIXED_WIDTH_CLASSES: Record<string, string> = {
  color: "w-[4.5rem] max-w-[4.5rem]",
  supplier: "w-[8rem] max-w-[8rem]",
  subcategory: "w-[7.5rem] max-w-[7.5rem]",
  tipo: "w-[5rem] max-w-[5rem]",
  description: "w-[10rem] max-w-[10rem]",
};

export function getTableCellClasses(
  role: TableColumnRole,
  extra?: string,
): string {
  return cn(ROLE_CELL_CLASSES[role], extra);
}

export function getTableHeadClasses(
  role: TableColumnRole,
  extra?: string,
): string {
  return cn(ROLE_HEAD_CLASSES[role], extra);
}

const CURRENCY_WIDTH_CLASSES: Record<string, string> = {
  purchase_unit_price: "w-[5.5rem] max-w-[5.5rem]",
  total_price: "w-[6rem] max-w-[6rem]",
  price_list: "w-[5.5rem] max-w-[5.5rem]",
  value: "w-[6.5rem] max-w-[6.5rem]",
};

function getTextFixedWidthClass(columnId: string): string {
  return TEXT_FIXED_WIDTH_CLASSES[columnId] ?? "";
}

function getCurrencyWidthClass(columnId: string): string {
  return CURRENCY_WIDTH_CLASSES[columnId] ?? "w-[6.5rem] max-w-[6.5rem]";
}

export function getColumnClassesById(
  columnId: string,
  preset: TableLayoutPreset,
): { cell: string; head: string } | null {
  const columns = getPresetColumns(preset);
  const column = columns.find((entry) => entry.id === columnId);
  if (!column) return null;

  const widthClass =
    column.role === "textFixed"
      ? getTextFixedWidthClass(columnId)
      : column.role === "currency"
        ? getCurrencyWidthClass(columnId)
        : "";

  return {
    cell: getTableCellClasses(column.role, widthClass),
    head: getTableHeadClasses(
      column.role,
      cn(widthClass, column.headerClassName),
    ),
  };
}

export type TableLayoutPreset =
  | "hierarchySummary"
  | "sellHierarchySummary"
  | "inventoryArticlesDense"
  | "inventoryArticlesCompact"
  | "inventoryArticlesDrilldown"
  | "sellProductsDense"
  | "sellProductsDrilldown";

export function getPresetColumns(preset: TableLayoutPreset): TableColumnDef[] {
  switch (preset) {
    case "hierarchySummary":
      return HIERARCHY_SUMMARY_COLUMNS;
    case "sellHierarchySummary":
      return SELL_HIERARCHY_SUMMARY_COLUMNS;
    case "inventoryArticlesDense":
      return INVENTORY_ARTICLES_DENSE_COLUMNS;
    case "inventoryArticlesCompact":
      return [
        ...INVENTORY_ARTICLES_COMPACT_EXTRA_COLUMNS,
        ...INVENTORY_ARTICLES_DENSE_COLUMNS,
      ];
    case "inventoryArticlesDrilldown":
      return INVENTORY_ARTICLES_DRILLDOWN_COLUMNS;
    case "sellProductsDense":
      return SELL_PRODUCTS_DENSE_COLUMNS;
    case "sellProductsDrilldown":
      return SELL_PRODUCTS_DRILLDOWN_COLUMNS;
  }
}

function getInventoryArticlesPresetName(
  includeSubcategory: boolean,
  isDrilldown: boolean,
): TableLayoutPreset {
  if (isDrilldown) return "inventoryArticlesDrilldown";
  if (includeSubcategory) return "inventoryArticlesCompact";
  return "inventoryArticlesDense";
}

export function getInventoryArticlesColumnRole(
  columnId: string,
  options: {
    includeSubcategory?: boolean;
    isDrilldown?: boolean;
  } = {},
): TableColumnRole | null {
  const { includeSubcategory = false, isDrilldown = false } = options;
  const preset = getInventoryArticlesPresetName(includeSubcategory, isDrilldown);
  const column = getPresetColumns(preset).find((entry) => entry.id === columnId);
  return column?.role ?? null;
}

const EDITABLE_CELL_OVERRIDES =
  "h-auto min-h-9 [&>div]:justify-center [&_[data-editable=true]]:justify-center [&_button]:h-7 [&_button]:-ml-1 [&_button]:px-1 [&_span]:text-center";

const EDITABLE_DIMENSION_OVERRIDES =
  "h-auto min-h-9 [&>div]:justify-center [&_[data-editable=true]]:justify-center [&_button]:h-7 [&_button]:-ml-1 [&_button]:px-0.5 [&_span]:truncate [&_span]:text-center";

const EDITABLE_NAME_OVERRIDES =
  "h-auto min-h-9 [&>div]:justify-start [&_[data-editable=true]]:justify-start [&_button]:h-7 [&_button]:-ml-1 [&_button]:px-1 [&_span]:whitespace-normal [&_span]:break-words [&_span]:text-left";

const EDITABLE_TEXT_OVERRIDES =
  "h-auto min-h-9 [&>div]:justify-center [&_[data-editable=true]]:justify-center [&_button]:h-7 [&_button]:-ml-1 [&_button]:px-1 [&_span]:truncate [&_span]:text-center";

export function getInventoryArticlesCellClassName(
  columnId: string,
  options: {
    includeSubcategory?: boolean;
    isDrilldown?: boolean;
  } = {},
): string {
  const { includeSubcategory = false, isDrilldown = false } = options;
  const preset = getInventoryArticlesPresetName(includeSubcategory, isDrilldown);
  const classes = getColumnClassesById(columnId, preset);

  if (!classes) {
    return cn(
      DENSE_BASE,
      "h-auto min-h-9 px-1.5 py-2 text-center align-middle",
      EDITABLE_CELL_OVERRIDES,
    );
  }

  let editableOverrides = EDITABLE_CELL_OVERRIDES;
  const role = getInventoryArticlesColumnRole(columnId, options);

  if (role === "descriptionFlex") {
    editableOverrides = EDITABLE_NAME_OVERRIDES;
  } else if (role === "nameNarrow" || role === "name") {
    editableOverrides =
      "h-auto min-h-9 [&>div]:justify-start [&_[data-editable=true]]:justify-start [&_button]:h-7 [&_button]:px-1 [&_span]:truncate [&_span]:text-left";
  } else if (role === "textFixed") {
    editableOverrides = EDITABLE_TEXT_OVERRIDES;
  } else if (role === "dimension") {
    editableOverrides = EDITABLE_DIMENSION_OVERRIDES;
  }

  return cn(classes.cell, editableOverrides);
}

export function getInventoryArticlesHeadClassName(
  columnId: string,
  options: {
    includeSubcategory?: boolean;
    isDrilldown?: boolean;
  } = {},
): string {
  const { includeSubcategory = false, isDrilldown = false } = options;
  const preset = getInventoryArticlesPresetName(includeSubcategory, isDrilldown);
  const classes = getColumnClassesById(columnId, preset);

  return (
    classes?.head ??
    cn(DENSE_BASE, "h-auto px-1.5 py-2 text-center align-middle")
  );
}

const SELL_PRODUCTS_EDITABLE_OVERRIDES =
  "h-auto min-h-9 [&>div]:justify-center [&_button]:h-7 [&_button]:px-1";

export function getSellProductsCellClassName(
  columnId: string,
  isDrilldown = false,
): string {
  const classes = getColumnClassesById(
    columnId,
    isDrilldown ? "sellProductsDrilldown" : "sellProductsDense",
  );

  if (!classes) {
    return cn(
      DENSE_BASE,
      "h-auto min-h-9 px-1.5 py-2 text-center align-middle",
      SELL_PRODUCTS_EDITABLE_OVERRIDES,
    );
  }

  let editableOverrides = SELL_PRODUCTS_EDITABLE_OVERRIDES;
  const role = getPresetColumns(
    isDrilldown ? "sellProductsDrilldown" : "sellProductsDense",
  ).find((column) => column.id === columnId)?.role;

  if (role === "descriptionFlex") {
    editableOverrides =
      "h-auto min-h-9 [&>div]:justify-start [&_button]:h-7 [&_button]:px-1 [&_span]:whitespace-normal [&_span]:break-words [&_span]:text-left";
  } else if (role === "nameNarrow" || role === "name") {
    editableOverrides =
      "h-auto min-h-9 [&>div]:justify-start [&_button]:h-7 [&_button]:px-1 [&_span]:truncate [&_span]:text-left";
  } else if (role === "textFixed" || role === "code") {
    editableOverrides =
      "h-auto min-h-9 [&>div]:justify-center [&_span]:truncate [&_span]:text-center";
  }

  return cn(classes.cell, editableOverrides);
}

export function getSellProductsHeadClassName(
  columnId: string,
  isDrilldown = false,
): string {
  const classes = getColumnClassesById(
    columnId,
    isDrilldown ? "sellProductsDrilldown" : "sellProductsDense",
  );
  return (
    classes?.head ??
    cn(DENSE_BASE, "h-auto px-1.5 py-2 text-center align-middle")
  );
}

export function getVisiblePresetColumns(
  visibleColumnIds: string[],
  preset: TableLayoutPreset,
): TableColumnDef[] {
  const presetColumns = getPresetColumns(preset);
  const columnById = new Map(presetColumns.map((column) => [column.id, column]));

  return visibleColumnIds
    .map((columnId) => columnById.get(columnId))
    .filter((column): column is TableColumnDef => Boolean(column));
}
