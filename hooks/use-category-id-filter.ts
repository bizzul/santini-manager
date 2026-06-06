"use client";

import { useCallback, useMemo, useState } from "react";

export function useCategoryIdFilter(allCategoryIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allSelected, setAllSelected] = useState(true);

  const isSomeSelected = selectedIds.length > 0 && !allSelected;

  const toggle = useCallback((categoryId: string) => {
    setAllSelected(false);
    setSelectedIds((prev) => {
      if (prev.includes(categoryId)) {
        const next = prev.filter((id) => id !== categoryId);
        if (next.length === 0) {
          setAllSelected(true);
          return [];
        }
        return next;
      }
      return [...prev, categoryId];
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setAllSelected(checked);
      if (checked) {
        setSelectedIds([]);
      } else {
        setSelectedIds(allCategoryIds);
      }
    },
    [allCategoryIds],
  );

  const allowedIds = useMemo(() => {
    if (allSelected) return null;
    return new Set(selectedIds);
  }, [allSelected, selectedIds]);

  const filterById = useCallback(
    <T extends { id: string }>(items: T[]): T[] => {
      if (allowedIds === null) return items;
      return items.filter((item) => allowedIds.has(item.id));
    },
    [allowedIds],
  );

  const reset = useCallback(() => {
    setAllSelected(true);
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    allSelected,
    isSomeSelected,
    toggle,
    toggleAll,
    filterById,
    reset,
  };
}
