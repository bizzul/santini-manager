"use client";

import { useCallback, useEffect, useState } from "react";

const ASSISTANT_VISIBILITY_STORAGE_KEY = "santini-manager-assistant-visible";
const ASSISTANT_VISIBILITY_CHANGE_EVENT = "assistant-visibility-change";

function readAssistantVisibility() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(ASSISTANT_VISIBILITY_STORAGE_KEY) !== "false";
}

export function useAssistantVisibility() {
  const [visible, setVisibleState] = useState(true);

  useEffect(() => {
    const syncVisibility = () => {
      setVisibleState(readAssistantVisibility());
    };

    syncVisibility();
    window.addEventListener("storage", syncVisibility);
    window.addEventListener(ASSISTANT_VISIBILITY_CHANGE_EVENT, syncVisibility);
    return () => {
      window.removeEventListener("storage", syncVisibility);
      window.removeEventListener(ASSISTANT_VISIBILITY_CHANGE_EVENT, syncVisibility);
    };
  }, []);

  const setVisible = useCallback((nextVisible: boolean) => {
    setVisibleState(nextVisible);
    window.localStorage.setItem(
      ASSISTANT_VISIBILITY_STORAGE_KEY,
      String(nextVisible)
    );
    window.dispatchEvent(new Event(ASSISTANT_VISIBILITY_CHANGE_EVENT));
  }, []);

  return { visible, setVisible };
}
