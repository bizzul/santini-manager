"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

// CSV columns for export - matching import format
// ID is included to allow updating existing records on re-import
const CSV_COLUMNS = [
  { key: "variant_id", header: "ID" },
  { key: "category", header: "CAT" },
  { key: "category_code", header: "COD_CAT" },
  { key: "subcategory", header: "S_CAT" },
  { key: "subcategory_code", header: "COD_S_CAT" },
  { key: "subcategory2", header: "S_CAT_2" },
  { key: "subcategory2_code", header: "COD_S_CAT_2" },
  { key: "color", header: "COLORE" },
  { key: "color_code", header: "COD_COLORE" },
  { key: "internal_code", header: "COD_INT" },
  { key: "warehouse_number", header: "NR_MAG" },
  { key: "supplier", header: "FORNITORE" },
  { key: "supplier_code", header: "COD_FORN" },
  { key: "producer", header: "PRODUTTORE" },
  { key: "producer_code", header: "COD_PROD" },
  { key: "name", header: "NOME" },
  { key: "description", header: "DESCRIZIONE" },
  { key: "url_tds", header: "URL_TDS" },
  { key: "image_url", header: "URL_IMM" },
  { key: "width", header: "LARGHEZZA" },
  { key: "height", header: "ALTEZZA" },
  { key: "thickness", header: "SPESSORE" },
  { key: "diameter", header: "DIAMETRO" },
  { key: "unit", header: "UNITÀ" },
  { key: "quantity", header: "PZ" },
  { key: "unit_price", header: "CHF_ACQUISTO" },
  { key: "sell_price", header: "CHF_VENDITA" },
];

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Format numbers with 2 decimal places for prices
  if (typeof value === "number") {
    return String(value);
  }

  const stringValue = String(value);

  // Escape values with commas, quotes, or newlines
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function ButtonExportCSV() {
  const [isLoading, setLoading] = useState(false);
  const { toast } = useToast();
  const pathname = usePathname();

  // Extract domain from pathname
  const domain = pathname.split("/")[2] || "";

  const handleExport = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/products", {
        method: "GET",
        headers: {
          "x-site-domain": domain,
        },
      });

      if (!response.ok) {
        throw new Error("Errore nel recupero dei dati");
      }

      const products = await response.json();

      if (!products || products.length === 0) {
        toast({
          variant: "destructive",
          description: "Nessun prodotto da esportare",
        });
        return;
      }

      // Create header row
      const headers = CSV_COLUMNS.map((col) => col.header);

      // Create data rows
      const rows = products.map((product: any) => {
        return CSV_COLUMNS.map((col) => escapeCSVValue(product[col.key]));
      });

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.join(",")),
      ].join("\n");

      // Create and trigger download
      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventario_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        description: `Esportati ${products.length} prodotti con successo!`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Errore durante l'esportazione",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Esportazione...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Esporta CSV
        </>
      )}
    </Button>
  );
}

export default ButtonExportCSV;
