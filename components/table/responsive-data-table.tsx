"use client";

import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HIDDEN_ON_MOBILE = new Set([
  "select",
  "visual",
  "hub",
  "insight",
  "image",
  "logo",
]);

function headerLabel<TData>(table: TanstackTable<TData>, columnId: string) {
  const column = table.getColumn(columnId);
  const header = column?.columnDef.header;
  if (typeof header === "string") return header;
  if (columnId === "actions") return "Azioni";
  if (columnId === "select") return "";
  return columnId;
}

type MobileTableCardsProps<TData> = {
  table: TanstackTable<TData>;
  emptyMessage?: string;
  className?: string;
};

/**
 * Card list used under `md`. First meaningful cell is the title; remaining
 * visible cells become labelled rows; `actions` / `select` stay as a footer.
 */
export function MobileTableCards<TData>({
  table,
  emptyMessage = "Nessun risultato.",
  className,
}: MobileTableCardsProps<TData>) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground md:hidden">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 md:hidden", className)}>
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const selectCell = cells.find((cell) => cell.column.id === "select");
        const actionCell = cells.find((cell) => cell.column.id === "actions");
        const contentCells = cells.filter(
          (cell) =>
            cell.column.id !== "select" &&
            cell.column.id !== "actions" &&
            !HIDDEN_ON_MOBILE.has(cell.column.id),
        );
        const [titleCell, ...detailCells] = contentCells;

        return (
          <article
            key={row.id}
            data-state={row.getIsSelected() ? "selected" : undefined}
            className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm data-[state=selected]:ring-2 data-[state=selected]:ring-primary"
          >
            <div className="flex items-start gap-3">
              {selectCell ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                  {flexRender(
                    selectCell.column.columnDef.cell,
                    selectCell.getContext(),
                  )}
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                {titleCell ? (
                  <div className="text-base font-semibold leading-snug">
                    {flexRender(
                      titleCell.column.columnDef.cell,
                      titleCell.getContext(),
                    )}
                  </div>
                ) : null}
                <dl className="mt-2 space-y-1.5">
                  {detailCells.slice(0, 5).map((cell) => (
                    <div
                      key={cell.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                        {headerLabel(table, cell.column.id)}
                      </dt>
                      <dd className="min-w-0 text-right">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            {actionCell ? (
              <div className="mt-3 flex min-h-11 items-center justify-end border-t border-border pt-3">
                {flexRender(
                  actionCell.column.columnDef.cell,
                  actionCell.getContext(),
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

type ResponsiveDataTableProps<TData> = {
  table: TanstackTable<TData>;
  emptyMessage?: string;
  columnCount: number;
  className?: string;
};

/**
 * Desktop table + mobile cards. Wrap existing tanstack tables with this
 * instead of copying markup on every list page.
 */
export function ResponsiveDataTable<TData>({
  table,
  emptyMessage = "Nessun risultato.",
  columnCount,
  className,
}: ResponsiveDataTableProps<TData>) {
  return (
    <>
      <MobileTableCards table={table} emptyMessage={emptyMessage} />
      <div
        className={cn(
          "hidden overflow-x-auto rounded-md border bg-card md:block",
          className,
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
