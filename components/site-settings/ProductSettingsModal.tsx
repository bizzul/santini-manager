"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { IconSelectorWithColor } from "@/components/kanbans/IconSelector";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { SellProductCategory } from "@/types/supabase";

interface ProductSettingsModalProps {
  siteId: string;
  trigger: React.ReactNode;
}

type CategoryForm = {
  id?: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  iconColor: string;
  imageUrl: string | null;
  supplierNames: string[];
};

const emptyForm = (): CategoryForm => ({
  name: "",
  description: "",
  color: "#3B82F6",
  icon: "Package",
  iconColor: "#3B82F6",
  imageUrl: null,
  supplierNames: [],
});

export default function ProductSettingsModal({
  siteId,
  trigger,
}: ProductSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<SellProductCategory[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [supplierInput, setSupplierInput] = useState("");

  useEffect(() => {
    if (!open) return;
    loadCategories();
  }, [open, siteId]);

  const totalProducts = useMemo(
    () => categories.reduce((count, category) => count + (category.productCount || 0), 0),
    [categories]
  );

  async function loadCategories() {
    setLoading(true);
    try {
      const response = await fetch(`/api/sell-products/categories?siteId=${siteId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile caricare le categorie");
      }
      setCategories(result.categories || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog(category?: SellProductCategory) {
    if (category) {
      setForm({
        id: category.id,
        name: category.name,
        description: category.description || "",
        color: category.color || "#3B82F6",
        icon: category.icon || "Package",
        iconColor: category.icon_color || category.color || "#3B82F6",
        imageUrl: category.image_url || null,
        supplierNames: category.supplier_names || [],
      });
    } else {
      setForm(emptyForm());
    }
    setSupplierInput("");
    setDialogOpen(true);
  }

  function addSupplier() {
    const value = supplierInput.trim();
    if (!value) return;
    if (form.supplierNames.includes(value)) {
      toast.error("Fornitore già inserito");
      return;
    }
    setForm((current) => ({
      ...current,
      supplierNames: [...current.supplierNames, value],
    }));
    setSupplierInput("");
  }

  function removeSupplier(name: string) {
    setForm((current) => ({
      ...current,
      supplierNames: current.supplierNames.filter((supplier) => supplier !== name),
    }));
  }

  function handleImageChange(file?: File | null) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Usa immagini quadrate fino a 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        imageUrl: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Il nome categoria è obbligatorio");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/sell-products/categories", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          siteId,
          name: form.name,
          description: form.description,
          color: form.color,
          icon: form.icon,
          iconColor: form.iconColor,
          imageUrl: form.imageUrl,
          supplierNames: form.supplierNames,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile salvare la categoria");
      }
      toast.success(form.id ? "Categoria aggiornata" : "Categoria creata");
      setDialogOpen(false);
      loadCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const response = await fetch(`/api/sell-products/categories?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile eliminare la categoria");
      }
      toast.success("Categoria eliminata");
      loadCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nell'eliminazione");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Prodotti</DialogTitle>
            <DialogDescription className="text-white/70">
              Gestisci categorie prodotto, grafica e fornitori suggeriti.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    Catalogo prodotti
                  </p>
                  <p className="text-xs text-white/60">
                    {categories.length} categorie e {totalProducts} prodotti associati
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => openCreateDialog()}
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi categoria
                </Button>
              </div>

              {categories.length === 0 ? (
                <Card className="border-white/15 bg-white/5">
                  <CardContent className="py-12 text-center text-white/65">
                    <Package className="mx-auto mb-4 h-10 w-10 opacity-60" />
                    <p>Nessuna categoria prodotto presente</p>
                    <p className="mt-2 text-sm">
                      Crea la prima categoria per organizzare il catalogo.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {categories.map((category) => (
                    <Card
                      key={category.id}
                      className="border-white/15 bg-white/5 text-white"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                              {category.image_url ? (
                                <img
                                  src={category.image_url}
                                  alt={category.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                                  style={{
                                    backgroundColor:
                                      category.icon_color || category.color || "#3B82F6",
                                  }}
                                >
                                  <Package className="h-5 w-5 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {category.name}
                              </CardTitle>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-white/20 text-white/75"
                                >
                                  {category.productCount || 0} prodotti
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="border-white/20 text-white/75"
                                >
                                  {(category.supplier_names || []).length} fornitori
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openCreateDialog(category)}
                              className="text-white/70 hover:bg-white/10 hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
                              className="text-white/70 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-white/65">
                          {category.description || "Nessuna descrizione"}
                        </p>
                        <Accordion type="single" collapsible>
                          <AccordionItem value={`suppliers-${category.id}`} className="border-white/10">
                            <AccordionTrigger className="py-2 text-sm text-white hover:no-underline">
                              <span className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-white/60" />
                                Elenco fornitori categoria
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              {(category.supplier_names || []).length === 0 ? (
                                <p className="text-sm text-white/50">
                                  Nessun fornitore associato.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {(category.supplier_names || []).map((supplier) => (
                                    <Badge
                                      key={supplier}
                                      variant="outline"
                                      className="border-blue-400/30 text-blue-200"
                                    >
                                      {supplier}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Modifica categoria prodotto" : "Nuova categoria prodotto"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Personalizza nome, grafica e fornitori principali della categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-white/80">Nome categoria</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Descrizione</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-white/80">Colore card</Label>
                <Input
                  type="color"
                  value={form.color}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, color: event.target.value }))
                  }
                  className="h-11 bg-white/10 border-white/30"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-white/80">Colore icona</Label>
                <Input
                  type="color"
                  value={form.iconColor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      iconColor: event.target.value,
                    }))
                  }
                  className="h-11 bg-white/10 border-white/30"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Icona</Label>
              <IconSelectorWithColor
                value={form.icon}
                onChange={(value) =>
                  setForm((current) => ({ ...current, icon: value }))
                }
                color={form.iconColor}
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Immagine quadrata opzionale</Label>
              <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/70 hover:bg-white/10">
                Carica immagine
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) =>
                    handleImageChange(event.target.files?.[0] || null)
                  }
                />
              </label>
              {form.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={form.imageUrl}
                    alt="Anteprima categoria"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <Label className="text-white/80">Fornitori possibili</Label>
              <div className="flex gap-2">
                <Input
                  value={supplierInput}
                  onChange={(event) => setSupplierInput(event.target.value)}
                  placeholder="Inserisci nome fornitore"
                  className="bg-white/10 border-white/30 text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSupplier}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Aggiungi
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.supplierNames.map((supplier) => (
                  <button
                    key={supplier}
                    type="button"
                    onClick={() => removeSupplier(supplier)}
                    className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-white/75 hover:bg-red-500/10 hover:text-red-200"
                  >
                    {supplier} x
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva categoria"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
