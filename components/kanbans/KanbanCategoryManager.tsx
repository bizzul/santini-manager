"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Folder } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getKanbanCategories,
  type KanbanCategory,
} from "@/app/sites/[domain]/kanban/actions/get-kanban-categories.action";
import { saveKanbanCategory } from "@/app/sites/[domain]/kanban/actions/save-kanban-category.action";
import { deleteKanbanCategory } from "@/app/sites/[domain]/kanban/actions/delete-kanban-category.action";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface KanbanCategoryManagerProps {
  domain: string;
  onCategoryChange?: () => void;
}

const ICON_OPTIONS = [
  { value: "Folder", label: "Cartella" },
  { value: "Briefcase", label: "Valigetta" },
  { value: "Factory", label: "Fabbrica" },
  { value: "Home", label: "Casa" },
  { value: "Building", label: "Edificio" },
  { value: "Package", label: "Pacco" },
  { value: "Settings", label: "Impostazioni" },
  { value: "Users", label: "Utenti" },
];

const COLOR_OPTIONS = [
  { value: "#3B82F6", label: "Blu" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Arancione" },
  { value: "#EF4444", label: "Rosso" },
  { value: "#8B5CF6", label: "Viola" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#6B7280", label: "Grigio" },
];

export function KanbanCategoryManager({
  domain,
  onCategoryChange,
}: KanbanCategoryManagerProps) {
  const [categories, setCategories] = useState<KanbanCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<KanbanCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<KanbanCategory | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    description: "",
    icon: "Folder",
    color: "#3B82F6",
    display_order: 0,
  });

  useEffect(() => {
    loadCategories();
  }, [domain]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getKanbanCategories(domain);
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le categorie",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (category?: KanbanCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        identifier: category.identifier,
        description: category.description || "",
        icon: category.icon || "Folder",
        color: category.color || "#3B82F6",
        display_order: category.display_order,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        identifier: "",
        description: "",
        icon: "Folder",
        color: "#3B82F6",
        display_order: categories.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.identifier) {
      toast({
        title: "Errore",
        description: "Nome e identificatore sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const categoryData = {
        ...(editingCategory?.id && { id: editingCategory.id }),
        name: formData.name,
        identifier: formData.identifier,
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
        display_order: formData.display_order,
      };

      const result = await saveKanbanCategory(categoryData, domain);

      if (result.success) {
        toast({
          title: "Successo",
          description: editingCategory
            ? "Categoria aggiornata con successo"
            : "Categoria creata con successo",
        });
        handleCloseDialog();
        loadCategories();
        onCategoryChange?.();
      } else {
        toast({
          title: "Errore",
          description: result.error || "Impossibile salvare la categoria",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la categoria",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (category: KanbanCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      const result = await deleteKanbanCategory(categoryToDelete.id, domain);

      if (result.success) {
        toast({
          title: "Successo",
          description: "Categoria eliminata con successo",
        });
        loadCategories();
        onCategoryChange?.();
      } else {
        toast({
          title: "Errore",
          description: result.error || "Impossibile eliminare la categoria",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la categoria",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Categorie Kanban</h3>
          <p className="text-sm text-muted-foreground">
            Gestisci le categorie per organizzare le tue kanban
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuova Categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Caricamento...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna categoria presente</p>
              <p className="text-sm">
                Crea la tua prima categoria per organizzare le kanban
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: category.color || "#3B82F6" }}
                    >
                      <Folder className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {category.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {category.identifier}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(category)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {category.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Modifica Categoria" : "Nuova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifica i dettagli della categoria"
                : "Crea una nuova categoria per organizzare le tue kanban"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="es. Ufficio, Produzione"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="identifier">Identificatore *</Label>
              <Input
                id="identifier"
                value={formData.identifier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    identifier: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                placeholder="es. ufficio, produzione"
                disabled={!!editingCategory}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrizione della categoria"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">Colore</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) =>
                    setFormData({ ...formData, color: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: option.value }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="display_order">Ordine</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la categoria "
              {categoryToDelete?.name}"? Questa azione non può essere annullata.
              Le kanban associate non verranno eliminate ma non avranno più una
              categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

