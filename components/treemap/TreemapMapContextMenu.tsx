"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MapContextMenuState {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

interface TreemapMapContextMenuProps {
  menu: MapContextMenuState | null;
  onClose: () => void;
  onAddAlbero: (coords: { lat: number; lng: number }) => void;
}

export default function TreemapMapContextMenu({
  menu,
  onClose,
  onAddAlbero,
}: TreemapMapContextMenuProps) {
  React.useEffect(() => {
    if (!menu) return;

    const close = () => onClose();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu, onClose]);

  if (!menu || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[450]"
        aria-hidden
        onClick={onClose}
        onContextMenu={(ev) => {
          ev.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        className={cn(
          "fixed z-[500] min-w-[180px] overflow-hidden rounded-lg border bg-popover p-1 shadow-lg",
        )}
        style={{ left: menu.x, top: menu.y }}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          onClick={() => {
            onAddAlbero({ lat: menu.lat, lng: menu.lng });
            onClose();
          }}
        >
          <Plus className="h-4 w-4 text-emerald-600" />
          Aggiungi albero
        </button>
      </div>
    </>,
    document.body,
  );
}
