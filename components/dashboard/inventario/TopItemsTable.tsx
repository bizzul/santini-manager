"use client";

import { Package } from "lucide-react";
import { InventoryDashboardStats } from "@/lib/server-data";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TopItemsTableProps {
  data: InventoryDashboardStats["topItems"];
}

function formatCurrency(value: number): string {
  return `CHF ${value.toLocaleString("it-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("it-CH");
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("it-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function TopItemsTable({ data }: TopItemsTableProps) {
  const params = useParams();
  const domain = params.domain as string;

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Package className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Top 30 articoli per valore</h3>
          <p className="text-xs text-muted-foreground">
            Articoli con maggior valore di stock
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="dashboard-panel-subtitle text-center py-8">
          Nessun articolo disponibile
        </div>
      ) : (
        <div className="dashboard-panel-inner overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="bg-slate-950/80 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nome
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Categoria
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Qtà
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Costo unit.
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Valore
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ultimo agg.
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/5">
              {data.map((item) => (
                <TableRow
                  key={`${item.id}-${item.variantId}`}
                  role="link"
                  tabIndex={0}
                  aria-label={`Apri articolo ${item.name}`}
                  className="cursor-pointer border-white/5 transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                  onClick={() => {
                    window.location.href = `/sites/${domain}/inventory?itemId=${item.id}`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      window.location.href = `/sites/${domain}/inventory?itemId=${item.id}`;
                    }
                  }}
                >
                  <TableCell className="px-3 py-3">
                    <span className="text-sm font-medium">{item.name}</span>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <span className="dashboard-panel-subtitle">
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right">
                    <span className="text-sm">
                      {formatNumber(item.quantity)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right">
                    <span className="dashboard-panel-subtitle">
                      {formatCurrency(item.unitCost)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right">
                    <span className="text-sm font-medium text-green-400">
                      {formatCurrency(item.totalValue)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.lastUpdate)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
