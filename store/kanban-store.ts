import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface KanbanCategory {
  id: number;
  name: string;
  identifier: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  display_order: number;
  site_id?: string | null;
}

export interface Kanban {
  id?: string;
  title: string;
  identifier: string;
  color?: string;
  icon?: string;
  category_id?: number | null;
  category?: KanbanCategory | null;
  columns: {
    id?: number;
    title: string;
    identifier: string;
    position: number;
    icon?: string;
  }[];
}

interface KanbanStore {
  kanbans: Kanban[];
  categories: KanbanCategory[];
  selectedCategoryId: number | null;
  setKanbans: (kanbans: Kanban[]) => void;
  setCategories: (categories: KanbanCategory[]) => void;
  setSelectedCategoryId: (categoryId: number | null) => void;
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set) => ({
      kanbans: [],
      categories: [],
      selectedCategoryId: null,
      setKanbans: (kanbans) => set({ kanbans }),
      setCategories: (categories) => set({ categories }),
      setSelectedCategoryId: (categoryId) =>
        set({ selectedCategoryId: categoryId }),
    }),
    {
      name: "kanban-storage",
    },
  ),
);
