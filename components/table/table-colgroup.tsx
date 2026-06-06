import type { TableColumnDef } from "@/lib/table-layout-presets";

interface TableColGroupProps {
  columns: TableColumnDef[];
}

export function TableColGroup({ columns }: TableColGroupProps) {
  return (
    <colgroup>
      {columns.map((column) => (
        <col
          key={column.id}
          style={column.width ? { width: column.width } : undefined}
        />
      ))}
    </colgroup>
  );
}
