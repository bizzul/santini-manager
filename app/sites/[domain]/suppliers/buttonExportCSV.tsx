"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

// CSV columns for export - matching import format
const CSV_COLUMNS = [
  { key: "name", header: "NOME" },
  { key: "short_name", header: "ABBREVIATO" },
  { key: "description", header: "DESCRIZIONE" },
  { key: "supplier_category.name", header: "CATEGORIA" },
  { key: "address", header: "INDIRIZZO" },
  { key: "cap", header: "CAP" },
  { key: "location", header: "LOCALITA" },
  { key: "website", header: "WEBSITE" },
  { key: "email", header: "EMAIL" },
  { key: "phone", header: "TELEFONO" },
  { key: "contact", header: "CONTATTO" },
];

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
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
      const response = await fetch("/api/suppliers", {
        method: "GET",
        headers: {
          "x-site-domain": domain,
        },
      });

      if (!response.ok) {
        throw new Error("Errore nel recupero dei dati");
      }

      const suppliers = await response.json();

      if (!suppliers || suppliers.length === 0) {
        toast({
          variant: "destructive",
          description: "Nessun fornitore da esportare",
        });
        return;
      }

      // Create header row
      const headers = CSV_COLUMNS.map((col) => col.header);

      // Create data rows
      const rows = suppliers.map((supplier: any) => {
        return CSV_COLUMNS.map((col) => {
          // Handle nested keys like "supplier_category.name"
          if (col.key.includes(".")) {
            const keys = col.key.split(".");
            let value = supplier;
            for (const k of keys) {
              value = value?.[k];
            }
            return escapeCSVValue(value);
          }
          return escapeCSVValue(supplier[col.key]);
        });
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
      link.download = `fornitori_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        description: `Esportati ${suppliers.length} fornitori con successo!`,
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
