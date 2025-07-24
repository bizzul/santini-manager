"use client";
import { useEffect } from "react";

export function SetBodyClass({ className }: { className?: string }) {
  useEffect(() => {
    // Save previous background style
    const prev = document.body.style.background;
    document.body.style.background = "transparent";
    if (className) document.body.classList.add(className);
    return () => {
      document.body.style.background = prev;
      if (className) document.body.classList.remove(className);
    };
  }, [className]);
  return null;
}
