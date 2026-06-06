"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  exportInventoryCsv,
  exportInventoryHierarchicalCsv,
} from "@/lib/inventory-csv-export";

function ButtonExportCSV() {
  const [isLoading, setLoading] = useState(false);
  const { toast } = useToast();
  const pathname = usePathname();

  const domain = pathname.split("/")[2] || "";

  const handleExport = async (mode: "flat" | "hierarchical") => {
    setLoading(true);

    try {
      const { rowCount } =
        mode === "hierarchical"
          ? await exportInventoryHierarchicalCsv({ domain })
          : await exportInventoryCsv({ domain });

      toast({
        description: `Esportati ${rowCount} articoli con successo!`,
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante l'esportazione",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Esportazione...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Esporta CSV
              <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("flat")}>
          Elenco articoli (formato import)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("hierarchical")}>
          Riepilogo per categoria e sottocategoria
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ButtonExportCSV;
