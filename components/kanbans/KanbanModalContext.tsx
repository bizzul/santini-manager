"use client";

import React, { createContext, useContext, useState } from "react";

interface KanbanModalContextType {
  isCreateModalOpen: boolean;
  preSelectedCategoryId: number | null;
  openCreateModal: (categoryId?: number | null) => void;
  closeCreateModal: () => void;
}

const KanbanModalContext = createContext<KanbanModalContextType | undefined>(
  undefined
);

export function KanbanModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [preSelectedCategoryId, setPreSelectedCategoryId] = useState<number | null>(null);

  const openCreateModal = (categoryId?: number | null) => {
    setPreSelectedCategoryId(categoryId || null);
    setIsCreateModalOpen(true);
  };
  
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setPreSelectedCategoryId(null); // Reset when closing
  };

  return (
    <KanbanModalContext.Provider
      value={{
        isCreateModalOpen,
        preSelectedCategoryId,
        openCreateModal,
        closeCreateModal,
      }}
    >
      {children}
    </KanbanModalContext.Provider>
  );
}

export function useKanbanModal() {
  const context = useContext(KanbanModalContext);
  if (context === undefined) {
    throw new Error("useKanbanModal must be used within a KanbanModalProvider");
  }
  return context;
}
