"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type KanbanDndLockContextValue = {
  isDragLocked: boolean;
  lockDrag: () => void;
  unlockDrag: () => void;
};

const KanbanDndLockContext = createContext<KanbanDndLockContextValue>({
  isDragLocked: false,
  lockDrag: () => {},
  unlockDrag: () => {},
});

export function KanbanDndLockProvider({ children }: { children: ReactNode }) {
  const [lockCount, setLockCount] = useState(0);

  const lockDrag = useCallback(() => {
    setLockCount((count) => count + 1);
  }, []);

  const unlockDrag = useCallback(() => {
    setLockCount((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    () => ({
      isDragLocked: lockCount > 0,
      lockDrag,
      unlockDrag,
    }),
    [lockCount, lockDrag, unlockDrag],
  );

  return (
    <KanbanDndLockContext.Provider value={value}>
      {children}
    </KanbanDndLockContext.Provider>
  );
}

export function useKanbanDndLock() {
  return useContext(KanbanDndLockContext);
}

/** Locks kanban card dragging for as long as `locked` is true. */
export function useLockKanbanDnd(locked: boolean) {
  const { lockDrag, unlockDrag } = useKanbanDndLock();

  useEffect(() => {
    if (!locked) return;
    lockDrag();
    return () => unlockDrag();
  }, [locked, lockDrag, unlockDrag]);
}
