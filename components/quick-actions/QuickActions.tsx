"use client";

import React from "react";
import { QuickActionsButton, QuickActionType } from "./QuickActionsButton";
import { useQuickActions } from "./QuickActionsProvider";

export function QuickActions() {
  const { openDialog } = useQuickActions();

  const handleActionClick = (action: QuickActionType) => {
    openDialog(action);
  };

  return <QuickActionsButton onActionClick={handleActionClick} />;
}
