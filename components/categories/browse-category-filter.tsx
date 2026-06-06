"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface BrowseCategoryFilterItem {
  id: string;
  name: string;
  code?: string | null;
  color?: string | null;
}

interface BrowseCategoryFilterProps {
  variant: "compact" | "cards";
  categories: BrowseCategoryFilterItem[];
  allSelected: boolean;
  selectedIds: string[];
  isSomeSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggle: (id: string) => void;
}

function getCompactLabel(category: BrowseCategoryFilterItem) {
  const label = category.code || category.name?.slice(0, 3) || "";
  return label.slice(0, 3).toUpperCase();
}

export function BrowseCategoryFilter({
  variant,
  categories,
  allSelected,
  selectedIds,
  isSomeSelected,
  onToggleAll,
  onToggle,
}: BrowseCategoryFilterProps) {
  if (categories.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Categoria:</span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="browse-all-categories"
              checked={isSomeSelected ? "indeterminate" : allSelected}
              onCheckedChange={onToggleAll}
            />
            <Label
              htmlFor="browse-all-categories"
              className="cursor-pointer text-sm font-normal"
            >
              Tutte le categorie
            </Label>
          </div>
          {categories.map((category) => {
            const isSelected = selectedIds.includes(category.id);
            return (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`browse-category-${category.id}`}
                  checked={isSelected}
                  onCheckedChange={() => onToggle(category.id)}
                />
                <Label
                  htmlFor={`browse-category-${category.id}`}
                  className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                  title={category.name}
                >
                  {getCompactLabel(category)}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const gridStyle =
    categories.length > 0
      ? { gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "rounded-lg border p-3",
          allSelected
            ? "border-primary/50 bg-primary/5"
            : "border-border/70 bg-background/40",
        )}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            id="browse-all-categories"
            checked={isSomeSelected ? "indeterminate" : allSelected}
            onCheckedChange={onToggleAll}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label
              htmlFor="browse-all-categories"
              className="cursor-pointer text-sm font-medium"
            >
              Tutte le categorie
            </Label>
            <p className="text-xs text-muted-foreground">
              Mostra l&apos;intero catalogo del sito.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2" style={gridStyle}>
        {categories.map((category) => {
          const isSelected = selectedIds.includes(category.id);
          return (
            <div
              key={category.id}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-background/40 hover:bg-accent/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Checkbox
                    id={`browse-category-${category.id}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggle(category.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <Label
                      htmlFor={`browse-category-${category.id}`}
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                    >
                      {category.color && (
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="break-words">{category.name}</span>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
