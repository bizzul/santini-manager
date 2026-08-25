import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { ArrowLeft } from "lucide-react";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  trailingAction?: () => void;
  trailingActionLabel?: string;
}

export function DataTablePagination<TData>({
  table,
  trailingAction,
  trailingActionLabel = "Indietro",
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} di{" "}
        {table.getFilteredRowModel().rows.length} righe selezionate.
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 lg:space-x-8">
        <div className="hidden items-center space-x-2 sm:flex">
          <p className="text-sm font-medium">Righe per pagina</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-11 w-[70px] md:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-h-11 w-auto items-center justify-center text-sm font-medium sm:w-[100px]">
          Pagina {table.getState().pagination.pageIndex + 1} di{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-11 w-11 p-0 lg:flex md:h-8 md:w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Prima pagina</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 p-0 md:h-8 md:w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Pagina precedente</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 p-0 md:h-8 md:w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Prossima pagina</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden h-11 w-11 p-0 lg:flex md:h-8 md:w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Ultima pagina</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
        {trailingAction ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={trailingAction}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {trailingActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
