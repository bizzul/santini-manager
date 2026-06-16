"use client";

import { useState } from "react";
import { Check, ChevronDown, Layers, Move, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DiagramLayoutsController } from "@/components/diagram/use-diagram-layouts";

interface DiagramEditToolbarProps {
  controller: DiagramLayoutsController;
  className?: string;
}

type NameDialog =
  | { mode: "create" }
  | { mode: "rename"; id: string; current: string }
  | null;

/** Edit-position toggle + saved-layouts menu for React Flow diagrams. */
export function DiagramEditToolbar({
  controller,
  className,
}: DiagramEditToolbarProps) {
  const {
    editMode,
    setEditMode,
    layouts,
    activeId,
    hasActive,
    isSaving,
    applyLayout,
    saveActive,
    saveAsNew,
    rename,
    remove,
  } = controller;

  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [nameValue, setNameValue] = useState("");

  const openCreate = () => {
    setNameValue("");
    setNameDialog({ mode: "create" });
  };
  const openRename = (id: string, current: string) => {
    setNameValue(current);
    setNameDialog({ mode: "rename", id, current });
  };

  const confirmName = () => {
    if (!nameDialog) return;
    if (nameDialog.mode === "create") {
      saveAsNew(nameValue);
    } else {
      rename(nameDialog.id, nameValue);
    }
    setNameDialog(null);
    setEditMode(false);
  };

  const handleDone = () => {
    if (hasActive) {
      saveActive();
      setEditMode(false);
      return;
    }
    // No active layout to overwrite: prompt for a name.
    openCreate();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {editMode ? (
        <Button
          type="button"
          size="sm"
          onClick={handleDone}
          disabled={isSaving}
          className="gap-2 shadow-sm"
        >
          <Check className="h-3.5 w-3.5" />
          Fatto
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditMode(true)}
          className="gap-2 bg-card shadow-sm"
        >
          <Move className="h-3.5 w-3.5" />
          Modifica posizione
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 bg-card shadow-sm"
          >
            <Layers className="h-3.5 w-3.5" />
            Layout
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Layout salvati</DropdownMenuLabel>
          {layouts.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Nessun layout salvato.
            </div>
          ) : (
            layouts.map((layout) => (
              <DropdownMenuItem
                key={layout.id}
                onSelect={(e) => {
                  e.preventDefault();
                  applyLayout(layout.id);
                }}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      activeId === layout.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{layout.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Rinomina layout"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRename(layout.id, layout.name);
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Elimina layout"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(layout.id);
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          {hasActive ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                saveActive();
              }}
              className="gap-2"
            >
              <Check className="h-3.5 w-3.5" />
              Salva modifiche
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              openCreate();
            }}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Salva come nuovo…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={nameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setNameDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {nameDialog?.mode === "rename"
                ? "Rinomina layout"
                : "Salva layout come nuovo"}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="Nome layout"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmName();
              }
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNameDialog(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={confirmName}
              disabled={!nameValue.trim() || isSaving}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
