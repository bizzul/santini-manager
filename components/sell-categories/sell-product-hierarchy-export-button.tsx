"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  buildSellProductExportFilename,
  exportSellProductsCsv,
  type SellProductExportFilter,
} from "@/lib/sell-product-csv-export";

interface SellProductHierarchyExportButtonProps {
  siteId: string;
  filter: SellProductExportFilter;
  subcategoryName?: string;
  label?: string;
  variant?: "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export function SellProductHierarchyExportButton({
  siteId,
  filter,
  subcategoryName,
  label = "Esporta",
  variant = "outline",
  size = "sm",
}: SellProductHierarchyExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async (event: React.MouseEvent) => {
    event.stopPropagation();

    setIsLoading(true);
    try {
      const { rowCount } = await exportSellProductsCsv({
        siteId,
        filter,
        filename: buildSellProductExportFilename({
          categoryName: filter.categoryName,
          subcategoryName,
        }),
      });

      toast({
        description: `Esportati ${rowCount} prodotti con successo!`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante l'esportazione",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isLoading || !siteId}
      className="h-8 gap-1"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
