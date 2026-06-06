"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  buildInventoryExportFilename,
  exportInventoryCsv,
  type InventoryExportFilter,
} from "@/lib/inventory-csv-export";

interface InventoryHierarchyExportButtonProps {
  domain: string;
  filter: InventoryExportFilter;
  subcategoryName?: string;
  label?: string;
  variant?: "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export function InventoryHierarchyExportButton({
  domain,
  filter,
  subcategoryName,
  label = "Esporta",
  variant = "outline",
  size = "sm",
}: InventoryHierarchyExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async (event: React.MouseEvent) => {
    event.stopPropagation();

    setIsLoading(true);
    try {
      const { rowCount } = await exportInventoryCsv({
        domain,
        filter,
        filename: buildInventoryExportFilename({
          categoryCode: filter.categoryCode,
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

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant={variant}
        size="icon"
        className="h-8 w-8"
        onClick={handleExport}
        disabled={isLoading}
        title={label}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isLoading}
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
