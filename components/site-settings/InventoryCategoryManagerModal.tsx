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
import { Loader2, Plus, Pencil, Trash2, Package } from "lucide-react";
import { InventoryCategory } from "@/types/supabase";

interface InventoryCategoryManagerModalProps {
  siteId: string;
  subdomain: string;
  trigger: React.ReactNode;
}

export default function InventoryCategoryManagerModal({
  siteId,
  subdomain,
  trigger,
}: InventoryCategoryManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [editingCategory, setEditingCategory] =
    useState<InventoryCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<InventoryCategory | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
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
      const response = await fetch(`/api/inventory/categories/`, {
        headers: {
          "x-site-domain": domain,
        },
      });
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

  const handleOpenForm = (category?: InventoryCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        code: category.code || "",
        description: category.description || "",
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        code: "",
        description: "",
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Il nome è obbligatorio");
      return;
    }

    setSaving(true);
    try {
      const categoryData = {
        ...(editingCategory?.id && { id: editingCategory.id }),
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
      };

      const response = await fetch(`/api/inventory/categories/`, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify(categoryData),
      });

      const result = await response.json();

      if (response.ok) {
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

  const handleDeleteClick = (category: InventoryCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(
        `/api/inventory/categories/?id=${categoryToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "x-site-domain": domain,
          },
        }
      );

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
              Gestione Categorie Inventario
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Gestisci le categorie per organizzare i prodotti dell'inventario.
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
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nessuna categoria presente</p>
                      <p className="text-sm mt-2">
                        Crea la tua prima categoria per organizzare l'inventario
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <Card
                      key={category.id}
                      className="bg-white/5 border-white/20"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-500">
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base text-white">
                                {category.name}
                              </CardTitle>
                              {category.code && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-white/30 text-white/70 mt-1"
                                >
                                  {category.code}
                                </Badge>
                              )}
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
                  ))}
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
                : "Crea una nuova categoria per organizzare l'inventario"}
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="es. Legno, Ferramenta"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code" className="text-white/80">
                Codice
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="es. LG, FE"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
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
              Gli articoli dell'inventario associati non verranno eliminati ma
              non avranno più una categoria.
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
