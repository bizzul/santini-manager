"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderOpen, Search } from "lucide-react";
import { DebouncedInput } from "@/components/debouncedInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import { CategoryCard } from "@/components/categories/category-card";
import { CategoryCardSkeleton } from "@/components/categories/category-card-skeleton";
import type {
  CategoryCardGridItem,
  CategoryCardSortField,
} from "@/types/category-cards";
import { getCategorySearchText } from "@/lib/category-display";
import { cn } from "@/lib/utils";

interface CategoryCardGridProps {
  items: CategoryCardGridItem[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onCardClick?: (item: CategoryCardGridItem) => void;
  onImageAction?: (item: CategoryCardGridItem) => void;
  onImageBrowse?: (item: CategoryCardGridItem) => void;
  imageBrowseTitle?: string;
  showSubcategoryStatsOnly?: boolean;
  sortable?: boolean;
  onReorder?: (items: CategoryCardGridItem[]) => void | Promise<void>;
}

function sortItems(
  items: CategoryCardGridItem[],
  sortField: CategoryCardSortField,
): CategoryCardGridItem[] {
  if (sortField === "custom") {
    return [...items].sort((a, b) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "it");
    });
  }

  return [...items].sort((a, b) => {
    switch (sortField) {
      case "pieces":
        return b.pieces - a.pieces;
      case "totalValue":
        return b.totalValue - a.totalValue;
      case "itemCount":
        return (b.itemCount ?? 0) - (a.itemCount ?? 0);
      case "name":
      default:
        return a.name.localeCompare(b.name, "it");
    }
  });
}

interface SortableCategoryCardProps {
  item: CategoryCardGridItem;
  showSubcategoryStatsOnly: boolean;
  onCardClick?: (item: CategoryCardGridItem) => void;
  onImageAction?: (item: CategoryCardGridItem) => void;
  onImageBrowse?: (item: CategoryCardGridItem) => void;
  imageBrowseTitle?: string;
}

function SortableCategoryCard({
  item,
  showSubcategoryStatsOnly,
  onCardClick,
  onImageAction,
  onImageBrowse,
  imageBrowseTitle,
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "z-10 opacity-80")}
    >
      <CategoryCard
        name={item.name}
        imageUrl={item.imageUrl}
        code={item.code}
        itemCount={item.itemCount}
        subcategoryCount={item.subcategoryCount}
        pieces={item.pieces}
        totalValue={item.totalValue}
        accentColor={item.accentColor}
        showSubcategoryStatsOnly={showSubcategoryStatsOnly}
        onClick={onCardClick ? () => onCardClick(item) : undefined}
        onImageAction={onImageAction ? () => onImageAction(item) : undefined}
        onImageBrowse={onImageBrowse ? () => onImageBrowse(item) : undefined}
        imageBrowseTitle={imageBrowseTitle}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

export function CategoryCardGrid({
  items,
  isLoading = false,
  emptyTitle = "Nessun elemento trovato",
  emptyDescription = "Non ci sono elementi da mostrare in questa vista.",
  onCardClick,
  onImageAction,
  onImageBrowse,
  imageBrowseTitle,
  showSubcategoryStatsOnly = false,
  sortable = false,
  onReorder,
}: CategoryCardGridProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<CategoryCardSortField>("custom");
  const [orderedItems, setOrderedItems] = useState(items);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = sortable ? orderedItems : items;
    const filtered = query
      ? source.filter((item) =>
          getCategorySearchText({
            name: item.name,
            code: item.code,
          }).includes(query),
        )
      : source;
    return sortItems(filtered, sortField);
  }, [items, orderedItems, search, sortField, sortable]);

  const canSort =
    sortable &&
    Boolean(onReorder) &&
    sortField === "custom" &&
    search.trim().length === 0;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const oldIndex = orderedItems.findIndex((item) => item.key === active.id);
    const newIndex = orderedItems.findIndex((item) => item.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextItems = arrayMove(orderedItems, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        sort_order: index,
      }),
    );

    setOrderedItems(nextItems);
    setSortField("custom");

    try {
      await onReorder(nextItems);
    } catch (error) {
      console.error("Failed to reorder items:", error);
      setOrderedItems(items);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CategoryCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  const gridContent = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredItems.map((item) =>
        canSort ? (
          <SortableCategoryCard
            key={item.key}
            item={item}
            showSubcategoryStatsOnly={showSubcategoryStatsOnly}
            onCardClick={onCardClick}
            onImageAction={onImageAction}
            onImageBrowse={onImageBrowse}
            imageBrowseTitle={imageBrowseTitle}
          />
        ) : (
          <CategoryCard
            key={item.key}
            name={item.name}
            imageUrl={item.imageUrl}
            code={item.code}
            itemCount={item.itemCount}
            subcategoryCount={item.subcategoryCount}
            pieces={item.pieces}
            totalValue={item.totalValue}
            accentColor={item.accentColor}
            showSubcategoryStatsOnly={showSubcategoryStatsOnly}
            onClick={onCardClick ? () => onCardClick(item) : undefined}
            onImageAction={
              onImageAction ? () => onImageAction(item) : undefined
            }
            onImageBrowse={
              onImageBrowse ? () => onImageBrowse(item) : undefined
            }
            imageBrowseTitle={imageBrowseTitle}
          />
        ),
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <DebouncedInput
            value={search}
            onChange={(value) => setSearch(String(value))}
            className="pl-9"
            placeholder="Cerca per nome o codice..."
          />
        </div>
        <Select
          value={sortField}
          onValueChange={(value) =>
            setSortField(value as CategoryCardSortField)
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Ordina per" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Ordine personalizzato</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="pieces">N. pezzi</SelectItem>
            <SelectItem value="totalValue">Valore</SelectItem>
            <SelectItem value="itemCount">N. articoli</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortable && canSort && (
        <p className="text-xs text-muted-foreground">
          Trascina le card usando la maniglia per riordinare.
        </p>
      )}

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : canSort ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredItems.map((item) => item.key)}
            strategy={rectSortingStrategy}
          >
            {gridContent}
          </SortableContext>
        </DndContext>
      ) : (
        gridContent
      )}
    </div>
  );
}
