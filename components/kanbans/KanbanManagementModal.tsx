"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { getKanbanIcon } from "@/lib/kanban-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { DialogFooter } from "../ui/dialog";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { deleteKanban } from "@/app/sites/[domain]/kanban/actions/delete-kanban.action";
import { KanbanCategorySelector } from "./KanbanCategorySelector";
import { Badge } from "../ui/badge";
import {
  getKanbanCategories,
  type KanbanCategory,
} from "@/app/sites/[domain]/kanban/actions/get-kanban-categories.action";
import { IconSelector } from "./IconSelector";
import { useQueryClient } from "@tanstack/react-query";

type ColumnType = "normal" | "won" | "lost" | "production" | "invoicing";

type Column = {
  title: string;
  identifier: string;
  position: number;
  icon: string;
  column_type?: ColumnType;
};

type ModalMode = "create" | "edit";

interface KanbanManagementModalProps {
  kanban?: any;
  onSave: (data: any) => Promise<void>;
  trigger: React.ReactNode;
  mode?: ModalMode;
  hasTasks?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  domain?: string;
  preSelectedCategoryId?: number | null;
}

// Helper function to generate identifier from title
const generateIdentifier = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters except spaces
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .substring(0, 50); // Limit length
};

export default function KanbanManagementModal({
  kanban,
  onSave,
  trigger,
  mode = "create",
  hasTasks = false,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  domain,
  preSelectedCategoryId,
}: KanbanManagementModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(kanban?.title || "");
  const [identifier, setIdentifier] = useState(kanban?.identifier || "");
  const [columns, setColumns] = useState<Column[]>(() => {
    const cols =
      kanban?.columns?.sort(
        (a: any, b: any) => (a.position || 0) - (b.position || 0)
      ) || [];
    return cols;
  });
  const [color, setColor] = useState(kanban?.color || "#1e293b");
  const [icon, setIcon] = useState(kanban?.icon || "Folder");
  const [categoryId, setCategoryId] = useState<number | null>(
    kanban?.category_id || null
  );
  const [categories, setCategories] = useState<KanbanCategory[]>([]);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // Nuovi stati per sistema offerte
  const [isOfferKanban, setIsOfferKanban] = useState(
    kanban?.is_offer_kanban || false
  );
  const [targetWorkKanbanId, setTargetWorkKanbanId] = useState<number | null>(
    kanban?.target_work_kanban_id || null
  );
  const [availableKanbans, setAvailableKanbans] = useState<any[]>([]);
  // Nuovi stati per routing produzione/fatturazione
  const [isWorkKanban, setIsWorkKanban] = useState(
    kanban?.is_work_kanban || false
  );
  const [isProductionKanban, setIsProductionKanban] = useState(
    kanban?.is_production_kanban || false
  );
  const [targetInvoiceKanbanId, setTargetInvoiceKanbanId] = useState<
    number | null
  >(kanban?.target_invoice_kanban_id || null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load categories when domain is available
  useEffect(() => {
    if (domain) {
      getKanbanCategories(domain)
        .then(setCategories)
        .catch((error) => console.error("Error loading categories:", error));
    }
  }, [domain]);

  // Load available kanbans for target selection
  useEffect(() => {
    if (domain && (isOfferKanban || isProductionKanban)) {
      fetch(`/api/kanban/list?domain=${domain}`)
        .then((res) => res.json())
        .then((data) => {
          // Filter out current kanban from options
          const filtered = (data || []).filter((k: any) => k.id !== kanban?.id);
          setAvailableKanbans(filtered);
        })
        .catch((error) => console.error("Error loading kanbans:", error));
    }
  }, [domain, isOfferKanban, isProductionKanban, kanban?.id]);

  // Use external open state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : open;
  const setIsOpen = externalOnOpenChange || setOpen;

  // Reset all form data when kanban changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(kanban?.title || "");
      setIdentifier(kanban?.identifier || "");
      setColor(kanban?.color || "#1e293b");
      setIcon(kanban?.icon || "Folder");

      // Use preSelectedCategoryId if provided and in create mode, otherwise use kanban's category
      if (mode === "create" && preSelectedCategoryId !== undefined) {
        setCategoryId(preSelectedCategoryId);
      } else {
        setCategoryId(kanban?.category_id || null);
      }

      // Reset offer kanban fields
      setIsOfferKanban(kanban?.is_offer_kanban || false);
      setTargetWorkKanbanId(kanban?.target_work_kanban_id || null);
      // Reset work/production kanban fields
      setIsWorkKanban(kanban?.is_work_kanban || false);
      setIsProductionKanban(kanban?.is_production_kanban || false);
      setTargetInvoiceKanbanId(kanban?.target_invoice_kanban_id || null);

      if (kanban?.columns) {
        const sortedColumns = kanban.columns.sort(
          (a: any, b: any) => (a.position || 0) - (b.position || 0)
        );
        setColumns(
          sortedColumns.map((col: any) => ({
            ...col,
            column_type: col.column_type || "normal",
          }))
        );
      } else {
        setColumns([]);
      }
    }
  }, [kanban, isOpen, preSelectedCategoryId, mode]);

  // Auto-generate kanban identifier when title changes
  useEffect(() => {
    if (title && mode === "create") {
      const generatedIdentifier = generateIdentifier(title);
      setIdentifier(generatedIdentifier);
    }
  }, [title, mode]);

  // Auto-generate column identifiers when kanban identifier or column titles change
  useEffect(() => {
    if (identifier && mode === "create") {
      setColumns((prev) =>
        prev.map((column) => ({
          ...column,
          identifier: column.title
            ? `${generateIdentifier(column.title)}_${identifier}`
            : column.identifier,
        }))
      );
    }
  }, [identifier, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !identifier) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Tutti i campi sono obbligatori",
      });
      return;
    }

    try {
      const kanbanData = {
        ...(kanban && { id: kanban.id }),
        title,
        identifier,
        color,
        icon,
        category_id: categoryId,
        // Nuovi campi per sistema offerte
        is_offer_kanban: isOfferKanban,
        target_work_kanban_id: isOfferKanban ? targetWorkKanbanId : null,
        // Nuovi campi per routing produzione/fatturazione
        is_work_kanban: isWorkKanban,
        is_production_kanban: isProductionKanban,
        target_invoice_kanban_id: isProductionKanban
          ? targetInvoiceKanbanId
          : null,
        columns: columns.map((col, index) => ({
          ...col,
          position: index + 1,
          column_type: col.column_type || "normal",
        })),
        // When there are tasks, we can update column titles/icons but not add/remove columns
        skipColumnUpdates: false, // Always allow column updates now
      };

      // console.log("💾 Saving kanban with data:", kanbanData);
      // console.log("💾 Number of columns:", columns.length);
      // console.log("💾 Skip column updates:", mode === "edit" && hasTasks);

      await onSave(kanbanData);
      setIsOpen(false);
      setOpen(false);
    } catch (error) {
      logger.error("Error saving kanban:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
      });
    }
  };

  const handleDeleteClick = () => {
    setDeleteConfirmName("");
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!kanban?.id) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare il kanban",
      });
      return;
    }

    if (deleteConfirmName !== kanban.title) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Il nome inserito non corrisponde",
      });
      return;
    }

    try {
      const result = await deleteKanban(kanban.id, domain);

      if (result.success) {
        toast({
          title: "Successo",
          description: result.tasksDisconnected
            ? `Kanban eliminato. ${result.tasksDisconnected} task sono state scollegate.`
            : "Kanban eliminato con successo",
        });
        setIsDeleteDialogOpen(false);
        setIsOpen(false);

        // Invalidate cache so sidebar and other components update immediately
        queryClient.invalidateQueries({ queryKey: ["kanbans-list"] });
        queryClient.invalidateQueries({ queryKey: ["kanbans"] });
        queryClient.invalidateQueries({ queryKey: ["kanban-categories"] });
      } else {
        toast({
          variant: "destructive",
          title: "Errore",
          description: result.error || "Impossibile eliminare il kanban",
        });
      }
    } catch (error) {
      logger.error("Error deleting kanban:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Si è verificato un errore durante l'eliminazione",
      });
    }
  };

  const updateColumnIcon = (index: number, icon: string) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, icon } : col))
    );
  };

  const handleColumnChange = (
    index: number,
    field: keyof Column,
    value: string
  ) => {
    setColumns((prev) => {
      const updated = prev.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      );

      // Auto-generate column identifier when title changes in create mode
      if (field === "title" && mode === "create" && identifier) {
        updated[index].identifier = value
          ? `${generateIdentifier(value)}_${identifier}`
          : "";
      }

      return updated;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {mode === "create" ? "Crea Nuovo Kanban" : "Modifica Kanban"}
            </DialogTitle>
            {categoryId &&
              categories.length > 0 &&
              (() => {
                const selectedCategory = categories.find(
                  (c) => c.id === categoryId
                );
                if (selectedCategory) {
                  return (
                    <Badge
                      style={{
                        backgroundColor: selectedCategory.color || "#3B82F6",
                        color: "white",
                      }}
                      className="text-xs px-2 py-1"
                    >
                      📁 {selectedCategory.name}
                    </Badge>
                  );
                }
                return null;
              })()}
          </div>
          <DialogDescription>
            {mode === "create"
              ? "Crea una nuova board kanban"
              : hasTasks
              ? "Modifica solo le icone delle colonne"
              : "Modifica la configurazione del kanban"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="identifier">Identificatore</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Colore</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10 p-1"
              />
              <div
                className="w-8 h-8 rounded-sm border"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon">Icona</Label>
            <IconSelector
              value={icon}
              onChange={setIcon}
              placeholder="Seleziona icona..."
            />
          </div>
          {domain && (
            <KanbanCategorySelector
              domain={domain}
              value={categoryId}
              onChange={setCategoryId}
            />
          )}

          {/* Sezione Tipo Kanban */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label className="text-sm font-semibold">Tipo Kanban</Label>

            {/* Kanban Offerte */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOfferKanban"
                  checked={isOfferKanban}
                  onChange={(e) => {
                    setIsOfferKanban(e.target.checked);
                    if (e.target.checked) {
                      setIsWorkKanban(false);
                      setIsProductionKanban(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="isOfferKanban"
                  className="cursor-pointer text-sm"
                >
                  Kanban Offerte
                </Label>
              </div>
              {isOfferKanban && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="targetKanban" className="text-xs">
                    Kanban destinazione lavori
                  </Label>
                  <Select
                    value={targetWorkKanbanId?.toString() || ""}
                    onValueChange={(value) =>
                      setTargetWorkKanbanId(value ? parseInt(value) : null)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleziona kanban avor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableKanbans
                        .filter((k) => !k.is_offer_kanban)
                        .map((k) => (
                          <SelectItem key={k.id} value={k.id.toString()}>
                            {k.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Kanban Avor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isWorkKanban"
                  checked={isWorkKanban}
                  onChange={(e) => {
                    setIsWorkKanban(e.target.checked);
                    if (e.target.checked) {
                      setIsOfferKanban(false);
                      setIsProductionKanban(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="isWorkKanban"
                  className="cursor-pointer text-sm"
                >
                  Kanban Avor
                </Label>
              </div>
              {isWorkKanban && (
                <p className="text-xs text-muted-foreground pl-6">
                  La colonna "Produzione" indirizzerà le task verso le kanban di
                  produzione in base alla categoria prodotto.
                </p>
              )}
            </div>

            {/* Kanban Produzione */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isProductionKanban"
                  checked={isProductionKanban}
                  onChange={(e) => {
                    setIsProductionKanban(e.target.checked);
                    if (e.target.checked) {
                      setIsOfferKanban(false);
                      setIsWorkKanban(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="isProductionKanban"
                  className="cursor-pointer text-sm"
                >
                  Kanban Produzione
                </Label>
              </div>
              {isProductionKanban && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="targetInvoiceKanban" className="text-xs">
                    Kanban destinazione fatture
                  </Label>
                  <Select
                    value={targetInvoiceKanbanId?.toString() || ""}
                    onValueChange={(value) =>
                      setTargetInvoiceKanbanId(value ? parseInt(value) : null)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleziona kanban fatture..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableKanbans
                        .filter(
                          (k) =>
                            !k.is_offer_kanban &&
                            !k.is_work_kanban &&
                            !k.is_production_kanban
                        )
                        .map((k) => (
                          <SelectItem key={k.id} value={k.id.toString()}>
                            {k.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Colonne</Label>
            <div className="flex items-center gap-2 font-semibold text-xs text-muted-foreground px-1">
              <div className="w-8" />
              <div className="flex-1">Titolo</div>
              <div className="flex-1">Identificatore</div>
              <div className="w-[100px]">Icona</div>
              {(isOfferKanban || isWorkKanban || isProductionKanban) && (
                <div className="w-[100px]">Tipo</div>
              )}
            </div>
            <div className="space-y-2">
              {columns.map((column, index) => (
                <div key={index} className="flex items-center gap-2">
                  {(mode === "create" || (mode === "edit" && !hasTasks)) && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setColumns((prev) => prev.filter((_, i) => i !== index))
                      }
                      disabled={columns.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {(mode === "create" || (mode === "edit" && !hasTasks)) && (
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (index > 0) {
                            setColumns((prev) => {
                              const arr = [...prev];
                              const temp = arr[index - 1];
                              arr[index - 1] = arr[index];
                              arr[index] = temp;
                              // Update positions
                              return arr.map((col, i) => ({
                                ...col,
                                position: i + 1,
                              }));
                            });
                          }
                        }}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (index < columns.length - 1) {
                            setColumns((prev) => {
                              const arr = [...prev];
                              const temp = arr[index + 1];
                              arr[index + 1] = arr[index];
                              arr[index] = temp;
                              // Update positions
                              return arr.map((col, i) => ({
                                ...col,
                                position: i + 1,
                              }));
                            });
                          }
                        }}
                        disabled={index === columns.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  )}
                  <Input
                    value={column.title}
                    onChange={(e) =>
                      handleColumnChange(index, "title", e.target.value)
                    }
                    className="flex-1"
                    placeholder="Nome colonna"
                  />
                  <Input
                    value={column.identifier}
                    onChange={(e) =>
                      handleColumnChange(index, "identifier", e.target.value)
                    }
                    className="flex-1"
                    disabled={mode === "edit"} // Identifier cannot be changed after creation
                    placeholder="identificatore"
                  />
                  <IconSelector
                    value={column.icon}
                    onChange={(value) => updateColumnIcon(index, value)}
                    className="w-[140px]"
                  />
                  {(isOfferKanban || isWorkKanban || isProductionKanban) && (
                    <Select
                      value={column.column_type || "normal"}
                      onValueChange={(value) =>
                        setColumns((prev) =>
                          prev.map((col, i) =>
                            i === index
                              ? { ...col, column_type: value as ColumnType }
                              : col
                          )
                        )
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normale</SelectItem>
                        {isOfferKanban && (
                          <>
                            <SelectItem value="won">Vinta</SelectItem>
                            <SelectItem value="lost">Persa</SelectItem>
                          </>
                        )}
                        {isWorkKanban && (
                          <SelectItem value="production">Produzione</SelectItem>
                        )}
                        {isProductionKanban && (
                          <SelectItem value="invoicing">
                            Fatturazione
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
            {(mode === "create" || (mode === "edit" && !hasTasks)) && (
              <Button
                type="button"
                onClick={() =>
                  setColumns((prev) => [
                    ...prev,
                    {
                      title: "",
                      identifier: "",
                      position: prev.length + 1,
                      icon: "Check",
                      column_type: "normal",
                    },
                  ])
                }
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Colonna
              </Button>
            )}
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              {mode === "edit" && kanban?.id && (
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina Kanban
                </Button>
              )}
              <Button type="submit">
                {mode === "create" ? "Crea" : "Salva Modifiche"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Conferma Eliminazione Kanban</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Stai per eliminare la kanban <strong>"{kanban?.title}"</strong>.
              </p>

              {hasTasks && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-yellow-800 font-semibold">⚠️ ATTENZIONE</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Questo kanban contiene task associati. Le task verranno{" "}
                    <strong>scollegate</strong>
                    dal kanban ma <strong>NON eliminate</strong>. Potrai
                    trovarle nella sezione task senza kanban assegnato.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirm-name" className="text-sm font-medium">
                  Per confermare, digita il nome esatto della kanban:
                </Label>
                <Input
                  id="confirm-name"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={kanban?.title}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Questa azione non può essere annullata.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>
              Annulla
            </AlertDialogCancel>
            <Button
              onClick={handleDeleteConfirm}
              variant="destructive"
              disabled={deleteConfirmName !== kanban?.title}
            >
              Elimina Definitivamente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
