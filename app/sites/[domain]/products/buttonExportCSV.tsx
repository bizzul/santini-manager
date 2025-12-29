"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSiteId } from "@/hooks/use-site-id";

// CSV columns for export
const CSV_COLUMNS = [
  { key: "internal_code", header: "COD_INT" },
  { key: "category.name", header: "CATEGORIA" },
  { key: "name", header: "NOME_PRODOTTO" },
  { key: "type", header: "SOTTOCATEGORIA" },
  { key: "description", header: "DESCRIZIONE" },
  { key: "price_list", header: "LISTINO_PREZZI" },
  { key: "image_url", header: "URL_IMMAGINE" },
  { key: "doc_url", header: "URL_DOC" },
  { key: "active", header: "ATTIVO" },
];

// Helper to get nested property value (e.g., "category.name")
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Convert booleans to SI/NO
  if (typeof value === "boolean") {
    return value ? "SI" : "NO";
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
  const { siteId, loading: siteLoading } = useSiteId(domain);

  const handleExport = async () => {
    if (!siteId) {
      toast({
        variant: "destructive",
        description: "Site non trovato",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/sell-products", {
        method: "GET",
        headers: {
          "x-site-id": siteId,
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
        return CSV_COLUMNS.map((col) =>
          escapeCSVValue(getNestedValue(product, col.key))
        );
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
      link.download = `prodotti_export_${
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
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isLoading || siteLoading || !siteId}
    >
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
