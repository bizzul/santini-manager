"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryDrillState } from "@/types/category-cards";

interface CategoryBreadcrumbProps {
  drill: CategoryDrillState;
  onNavigate: (drill: CategoryDrillState) => void;
}

export function CategoryBreadcrumb({
  drill,
  onNavigate,
}: CategoryBreadcrumbProps) {
  if (drill.level === "categories") {
    return null;
  }

  return (
    <nav
      aria-label="Percorso categorie"
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      <Button
        type="button"
        variant="link"
        className="h-auto px-0 text-sm"
        onClick={() => onNavigate({ level: "categories" })}
      >
        Categorie
      </Button>

      {drill.categoryName && (
        <>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          {drill.level === "subcategories" ||
          drill.level === "categoryArticles" ? (
            <span className="font-medium text-foreground">{drill.categoryName}</span>
          ) : (
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-sm"
              onClick={() =>
                onNavigate({
                  level: "subcategories",
                  categoryId: drill.categoryId,
                  categoryName: drill.categoryName,
                })
              }
            >
              {drill.categoryName}
            </Button>
          )}
        </>
      )}

      {drill.level === "articles" && drill.subcategoryName && (
        <>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium text-foreground">
            {drill.subcategoryName}
          </span>
        </>
      )}
    </nav>
  );
}
