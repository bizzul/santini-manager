"use client";

import { Package } from "lucide-react";
import { InventoryDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

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
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
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
        <div className="text-sm text-muted-foreground text-center py-8">
          Nessun articolo disponibile
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Nome
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Categoria
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Qtà
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Costo unit.
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Valore
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Ultimo agg.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((item) => (
                <tr
                  key={`${item.id}-${item.variantId}`}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => {
                    window.location.href = `/sites/${domain}/inventory?itemId=${item.id}`;
                  }}
                >
                  <td className="py-3 px-2">
                    <span className="text-sm font-medium">{item.name}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-muted-foreground">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm">
                      {formatNumber(item.quantity)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.unitCost)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm font-medium text-green-400">
                      {formatCurrency(item.totalValue)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.lastUpdate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
