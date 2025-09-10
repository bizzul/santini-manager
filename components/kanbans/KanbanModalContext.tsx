"use client";

import React, { createContext, useContext, useState } from "react";

interface KanbanModalContextType {
  isCreateModalOpen: boolean;
  openCreateModal: () => void;
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

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  return (
    <KanbanModalContext.Provider
      value={{
        isCreateModalOpen,
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
