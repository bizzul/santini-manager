import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Kanban {
  id?: string;
  title: string;
  identifier: string;
  color?: string;
  type?: "office" | "production";
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
  setKanbans: (kanbans: Kanban[]) => void;
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set) => ({
      kanbans: [],
      setKanbans: (kanbans) => set({ kanbans }),
    }),
    {
      name: "kanban-storage",
    }
  )
);
