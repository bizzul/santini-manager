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
import { useSiteId } from "@/hooks/use-site-id";
import {
  exportSellProductsCsv,
  exportSellProductsHierarchicalCsv,
} from "@/lib/sell-product-csv-export";

function ButtonExportCSV() {
  const [isLoading, setLoading] = useState(false);
  const { toast } = useToast();
  const pathname = usePathname();

  const domain = pathname.split("/")[2] || "";
  const { siteId, loading: siteLoading } = useSiteId(domain);

  const handleExport = async (mode: "flat" | "hierarchical") => {
    if (!siteId) {
      toast({
        variant: "destructive",
        description: "Site non trovato",
      });
      return;
    }

    setLoading(true);

    try {
      const { rowCount } =
        mode === "hierarchical"
          ? await exportSellProductsHierarchicalCsv({ siteId })
          : await exportSellProductsCsv({ siteId });

      toast({
        description: `Esportati ${rowCount} prodotti con successo!`,
      });
    } catch (error: unknown) {
      console.error("Errore esportazione prodotti CSV", {
        siteId,
        domain,
        error,
      });
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
        <Button
          variant="outline"
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
              <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("flat")}>
          Elenco prodotti (formato import)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("hierarchical")}>
          Riepilogo per categoria e sottocategoria
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ButtonExportCSV;
