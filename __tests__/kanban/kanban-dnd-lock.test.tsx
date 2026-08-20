/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  KanbanDndLockProvider,
  useKanbanDndLock,
  useLockKanbanDnd,
} from "@/components/kanbans/kanban-dnd-lock";

function LockProbe({ locked }: { locked: boolean }) {
  useLockKanbanDnd(locked);
  const { isDragLocked } = useKanbanDndLock();
  return <span data-testid="lock-state">{isDragLocked ? "locked" : "open"}</span>;
}

function Harness({ locked }: { locked: boolean }) {
  return (
    <KanbanDndLockProvider>
      <LockProbe locked={locked} />
    </KanbanDndLockProvider>
  );
}

describe("kanban dnd lock", () => {
  it("locks dragging while a project sheet is open and unlocks when it closes", () => {
    const { rerender } = render(<Harness locked={false} />);

    expect(screen.getByTestId("lock-state").textContent).toBe("open");

    rerender(<Harness locked={true} />);
    expect(screen.getByTestId("lock-state").textContent).toBe("locked");

    rerender(<Harness locked={false} />);
    expect(screen.getByTestId("lock-state").textContent).toBe("open");
  });
});
