"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Folder } from "lucide-react";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { IconSelectorWithColor } from "@/components/kanbans/IconSelector";

interface KanbanCategoryManagerModalProps {
  siteId: string;
  subdomain: string;
  trigger: React.ReactNode;
}

interface KanbanCategory {
  id: number;
  name: string;
  identifier: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  site_id: string;
  created_at: string;
  updated_at: string;
}

// Helper function to generate identifier from name
const generateIdentifier = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters except spaces
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
};

export default function KanbanCategoryManagerModal({
  siteId,
  subdomain,
  trigger,
}: KanbanCategoryManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<KanbanCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<KanbanCategory | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<KanbanCategory | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    description: "",
    icon: "Folder",
    color: "#3B82F6",
    display_order: 0,
  });

  // Get the full domain for API calls
  const domain = `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open, domain]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/kanban/categories?domain=${encodeURIComponent(domain)}`
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Impossibile caricare le categorie");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (category?: KanbanCategory) => {
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
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  // Handle name change and auto-generate identifier
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Auto-generate identifier only when creating new category
      identifier: editingCategory ? prev.identifier : generateIdentifier(name),
    }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Il nome è obbligatorio");
      return;
    }

    // Auto-generate identifier if empty
    const identifier = formData.identifier || generateIdentifier(formData.name);

    setSaving(true);
    try {
      const categoryData = {
        ...(editingCategory?.id && { id: editingCategory.id }),
        name: formData.name,
        identifier,
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
        display_order: formData.display_order,
      };

      const response = await fetch(`/api/kanban/categories/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryData, domain }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          editingCategory
            ? "Categoria aggiornata con successo"
            : "Categoria creata con successo"
        );
        handleCloseForm();
        loadCategories();
      } else {
        toast.error(result.error || "Impossibile salvare la categoria");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Impossibile salvare la categoria");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (category: KanbanCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/kanban/categories/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: categoryToDelete.id, domain }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Categoria eliminata con successo");
        loadCategories();
      } else {
        toast.error(result.error || "Impossibile eliminare la categoria");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Impossibile eliminare la categoria");
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Gestione Categorie Kanban
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Gestisci le categorie per organizzare le tue kanban boards. Le
              categorie verranno visualizzate nella sidebar.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => handleOpenForm()}
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuova Categoria
                </Button>
              </div>

              {categories.length === 0 ? (
                <Card className="bg-white/5 border-white/20">
                  <CardContent className="py-12">
                    <div className="text-center text-white/60">
                      <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nessuna categoria presente</p>
                      <p className="text-sm mt-2">
                        Crea la tua prima categoria per organizzare le kanban
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => {
                    const IconComponent = getKanbanIcon(category.icon);
                    return (
                      <Card
                        key={category.id}
                        className="bg-white/5 border-white/20"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded flex items-center justify-center"
                                style={{
                                  backgroundColor: category.color || "#3B82F6",
                                }}
                              >
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-base text-white">
                                  {category.name}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className="text-xs mt-1 border-white/30 text-white/70"
                                >
                                  {category.identifier}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(category)}
                                className="text-white/70 hover:text-white hover:bg-white/10"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(category)}
                                className="text-white/70 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {category.description && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-white/60">
                              {category.description}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCategory ? "Modifica Categoria" : "Nuova Categoria"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {editingCategory
                ? "Modifica i dettagli della categoria"
                : "Crea una nuova categoria per organizzare le tue kanban"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white/80">
                Nome *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="es. Ufficio, Produzione"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
              {formData.name && !editingCategory && (
                <p className="text-xs text-white/60">
                  Identificatore:{" "}
                  <code className="bg-white/10 px-1 rounded">
                    {formData.identifier || generateIdentifier(formData.name)}
                  </code>
                </p>
              )}
              {editingCategory && (
                <p className="text-xs text-white/60">
                  Identificatore:{" "}
                  <code className="bg-white/10 px-1 rounded">
                    {formData.identifier}
                  </code>
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white/80">
                Descrizione
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrizione della categoria"
                rows={3}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="icon" className="text-white/80">
                Icona
              </Label>
              <IconSelectorWithColor
                value={formData.icon}
                onChange={(value) => setFormData({ ...formData, icon: value })}
                color={formData.color}
                placeholder="Seleziona icona..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color" className="text-white/80">
                Colore
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-20 h-10 p-1 cursor-pointer bg-white/10 border-white/30"
                />
                <div
                  className="w-10 h-10 rounded border border-white/30 flex-shrink-0"
                  style={{ backgroundColor: formData.color }}
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="#3B82F6"
                  className="flex-1 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="display_order" className="text-white/80">
                Ordine
              </Label>
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
                className="bg-white/10 border-white/30 text-white"
              />
            </div>

            {/* Preview */}
            <div className="pt-2 border-t border-white/10">
              <Label className="text-white/80 text-sm">Anteprima Sidebar</Label>
              <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = getKanbanIcon(formData.icon);
                    return (
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: formData.color }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    );
                  })()}
                  <span className="text-white font-medium">
                    {formData.name || "Nome categoria"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseForm}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Elimina Categoria
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Sei sicuro di voler eliminare la categoria "
              {categoryToDelete?.name}"? Questa azione non può essere annullata.
              Le kanban associate non verranno eliminate ma non avranno più una
              categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/30 text-white hover:bg-white/10">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
