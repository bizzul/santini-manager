"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

// CSV columns for export - matching import format
// ID is included to allow updating existing records on re-import
const CSV_COLUMNS = [
  { key: "id", header: "ID" },
  { key: "clientType", header: "TIPO" },
  { key: "businessName", header: "RAGIONE_SOCIALE" },
  { key: "individualTitle", header: "TITOLO" },
  { key: "individualFirstName", header: "NOME" },
  { key: "individualLastName", header: "COGNOME" },
  { key: "clientLanguage", header: "LINGUA" },
  { key: "address", header: "INDIRIZZO" },
  { key: "city", header: "CITTA" },
  { key: "countryCode", header: "NAZIONE" },
  { key: "zipCode", header: "CAP" },
  { key: "landlinePhone", header: "TELEFONO" },
  { key: "mobilePhone", header: "CELLULARE" },
  { key: "email", header: "EMAIL" },
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
      const response = await fetch("/api/clients", {
        method: "GET",
        headers: {
          "x-site-domain": domain,
        },
      });

      if (!response.ok) {
        throw new Error("Errore nel recupero dei dati");
      }

      const clients = await response.json();

      if (!clients || clients.length === 0) {
        toast({
          variant: "destructive",
          description: "Nessun cliente da esportare",
        });
        return;
      }

      // Create header row
      const headers = CSV_COLUMNS.map((col) => col.header);

      // Create data rows
      const rows = clients.map((client: any) => {
        return CSV_COLUMNS.map((col) => escapeCSVValue(client[col.key]));
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
      link.download = `clienti_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        description: `Esportati ${clients.length} clienti con successo!`,
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
