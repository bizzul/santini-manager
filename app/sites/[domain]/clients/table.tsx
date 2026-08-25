"use client";

import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
  RowSelectionState,
} from "@tanstack/react-table";
import { useState } from "react";

import { DataTablePagination } from "@/components/table/pagination";
import { DebouncedInput } from "@/components/debouncedInput";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { batchDeleteClients } from "./actions/delete-item.action";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/i18n-provider";
import { ResponsiveDataTable } from "@/components/table/responsive-data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DataTableProps<TData extends { id: number }, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  domain?: string;
}

export function DataTable<TData extends { id: number }, TValue>({
  columns,
  data,
  domain,
}: DataTableProps<TData, TValue>) {
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const t = useT();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    enableGlobalFilter: true,
    enableRowSelection: true,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBatchDelete = async () => {
    if (selectedCount === 0) return;

    setIsDeleting(true);
    try {
      const ids = selectedRows.map((row) => row.original.id);
      const result = await batchDeleteClients(ids, domain);

      if (result.success) {
        toast({
          description: t("clients.deletedSuccess", { count: result.deleted ?? 0 }),
        });
        setRowSelection({});
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          description: result.message || t("clients.deleteError"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: t("clients.deleteError"),
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 py-4">
        <DebouncedInput
          value={globalFilter ?? ""}
          onChange={(value) => setGlobalFilter(String(value))}
          className="h-11 w-full max-w-full sm:max-w-sm"
          placeholder={t("clients.searchPlaceholder")}
          type="search"
          inputMode="search"
        />

        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {t("clients.deleteSelected", { count: selectedCount })}
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clients.deleteConfirmDescription", { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("clients.deleting")}
                </>
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResponsiveDataTable
        table={table}
        columnCount={columns.length}
        emptyMessage={t("clients.noResults")}
      />
      <div className="pt-8">
        {/* Pagination controls */}
        <DataTablePagination table={table} />
      </div>
    </>
  );
}
