"use client";

import { GitBranch, LayoutGrid, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryViewMode } from "@/types/category-cards";

interface CategoryViewToggleProps {
  value: CategoryViewMode;
  onChange: (mode: CategoryViewMode) => void;
  disabled?: boolean;
  /** When false, only Tabella and Riquadri are shown (management pages). */
  showDiagram?: boolean;
}

export function CategoryViewToggle({
  value,
  onChange,
  disabled = false,
  showDiagram = false,
}: CategoryViewToggleProps) {
  return (
    <div
      className="flex items-center rounded-md border bg-background p-0.5"
      role="group"
      aria-label="Modalità visualizzazione categorie"
    >
      <Button
        type="button"
        variant={value === "table" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 gap-1.5 px-3"
        onClick={() => onChange("table")}
        disabled={disabled}
        aria-pressed={value === "table"}
      >
        <TableProperties className="h-4 w-4" aria-hidden="true" />
        Tabella
      </Button>
      <Button
        type="button"
        variant={value === "grid" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 gap-1.5 px-3"
        onClick={() => onChange("grid")}
        disabled={disabled}
        aria-pressed={value === "grid"}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        Riquadri
      </Button>
      {showDiagram ? (
        <Button
          type="button"
          variant={value === "diagram" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 px-3"
          onClick={() => onChange("diagram")}
          disabled={disabled}
          aria-pressed={value === "diagram"}
        >
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          Diagramma
        </Button>
      ) : null}
    </div>
  );
}
