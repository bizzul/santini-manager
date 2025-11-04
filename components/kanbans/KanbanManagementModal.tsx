"use client";

import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faPlay,
  faHammer,
  faBox,
  faTruck,
  faCheck,
  faClock,
  faTools,
  faScrewdriverWrench,
  faScrewdriver,
  faRuler,
  faRulerCombined,
  faRulerVertical,
  faRulerHorizontal,
  faToolbox,
  faCubes,
  faCouch,
  faChair,
  faTree,
  faLayerGroup,
  faClipboardCheck,
  faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";
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

type Column = {
  title: string;
  identifier: string;
  position: number;
  icon: string;
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
}

const iconOptions = [
  { value: "faPlay", icon: faPlay, label: "Play" },
  { value: "faHammer", icon: faHammer, label: "Hammer" },
  { value: "faBox", icon: faBox, label: "Box" },
  { value: "faTruck", icon: faTruck, label: "Truck" },
  { value: "faCheck", icon: faCheck, label: "Check" },
  { value: "faClock", icon: faClock, label: "Clock" },
  { value: "faTools", icon: faTools, label: "Tools" },
  {
    value: "faScrewdriverWrench",
    icon: faScrewdriverWrench,
    label: "Attrezzi",
  },
  { value: "faScrewdriver", icon: faScrewdriver, label: "Cacciavite" },
  { value: "faRuler", icon: faRuler, label: "Righello" },
  {
    value: "faRulerCombined",
    icon: faRulerCombined,
    label: "Righello Combinato",
  },
  {
    value: "faRulerVertical",
    icon: faRulerVertical,
    label: "Righello Verticale",
  },
  {
    value: "faRulerHorizontal",
    icon: faRulerHorizontal,
    label: "Righello Orizzontale",
  },
  { value: "faToolbox", icon: faToolbox, label: "Cassetta Attrezzi" },
  { value: "faCubes", icon: faCubes, label: "Cubi" },
  { value: "faCouch", icon: faCouch, label: "Divano" },
  { value: "faChair", icon: faChair, label: "Sedia" },
  { value: "faTree", icon: faTree, label: "Albero" },
  { value: "faLayerGroup", icon: faLayerGroup, label: "Strati" },
  { value: "faClipboardCheck", icon: faClipboardCheck, label: "Controllo" },
  { value: "faBoxesStacked", icon: faBoxesStacked, label: "Scatole" },
];

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
}: KanbanManagementModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(kanban?.title || "");
  const [identifier, setIdentifier] = useState(kanban?.identifier || "");
  const [columns, setColumns] = useState<Column[]>(
    kanban?.columns?.sort(
      (a: any, b: any) => (a.position || 0) - (b.position || 0)
    ) || []
  );
  const [color, setColor] = useState(kanban?.color || "#1e293b");
  const { toast } = useToast();

  // Use external open state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : open;
  const setIsOpen = externalOnOpenChange || setOpen;

  useEffect(() => {
    if (kanban?.columns) {
      setColumns(
        kanban.columns.sort(
          (a: any, b: any) => (a.position || 0) - (b.position || 0)
        )
      );
    }
  }, [kanban]);

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
        columns: columns.map((col, index) => ({
          ...col,
          position: index + 1,
        })),
      };

      await onSave(kanbanData);
      setIsOpen(false);
      setOpen(false);
    } catch (error) {
      console.error("Error saving kanban:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
      });
    }
  };

  const handleDelete = async () => {
    if (!kanban?.id) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare il kanban",
      });
      return;
    }

    try {
      await deleteKanban(kanban.id, domain);
      toast({
        title: "Successo",
        description: "Kanban eliminato con successo",
      });
    } catch (error) {
      console.error("Error deleting kanban:", error);
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
          <DialogTitle>
            {mode === "create" ? "Crea Nuovo Kanban" : "Modifica Kanban"}
          </DialogTitle>
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
            <Label>Colonne</Label>
            <div className="flex items-center gap-2 font-semibold text-xs text-muted-foreground px-1">
              <div className="w-8" />
              <div className="flex-1">Titolo</div>
              <div className="flex-1">Identificatore</div>
              <div className="w-[100px]">Icona</div>
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
                      <FontAwesomeIcon icon={faTrash} />
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
                    disabled={
                      mode !== "create" && (mode !== "edit" || hasTasks)
                    }
                  />
                  <Input
                    value={column.identifier}
                    onChange={(e) =>
                      handleColumnChange(index, "identifier", e.target.value)
                    }
                    className="flex-1"
                    disabled={
                      mode !== "create" && (mode !== "edit" || hasTasks)
                    }
                  />
                  <Select
                    value={column.icon}
                    onValueChange={(value) => updateColumnIcon(index, value)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {iconOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={opt.icon} />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      icon: "faCheck",
                    },
                  ])
                }
                variant="outline"
                size="sm"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Aggiungi Colonna
              </Button>
            )}
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              {mode === "edit" && kanban?.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button">
                      <FontAwesomeIcon icon={faTrash} className="mr-2" />
                      Elimina Kanban
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler eliminare il kanban "{kanban.title}
                        "? Questa azione non può essere annullata.
                        {hasTasks && (
                          <span className="block mt-2 text-red-600 font-semibold">
                            ATTENZIONE: Questo kanban contiene task associati.
                            Elimina prima tutti i task prima di procedere.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="submit">
                {mode === "create" ? "Crea" : "Salva Modifiche"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
