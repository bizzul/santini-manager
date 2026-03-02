"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { AVAILABLE_MODULES } from "@/lib/module-config";
import type { UserPermissions } from "@/types/supabase";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface KanbanCategory {
  id: number;
  name: string;
  identifier: string;
  icon?: string | null;
  color?: string | null;
}

interface Kanban {
  id: number;
  title: string;
  identifier: string;
  category_id?: number | null;
  icon?: string | null;
}

interface UserPermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  domain: string;
  siteId: string;
}

export function UserPermissionsDialog({
  isOpen,
  onClose,
  userId,
  userName,
  domain,
  siteId,
}: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for selected permissions
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [selectedKanbans, setSelectedKanbans] = useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  
  // Data from server
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [kanbanCategories, setKanbanCategories] = useState<KanbanCategory[]>([]);
  const [enabledSiteModules, setEnabledSiteModules] = useState<Set<string>>(new Set());
  
  // Collapsible state for categories
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // Group modules by category for display
  const modulesByCategory = AVAILABLE_MODULES.reduce((acc, module) => {
    const category = module.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_MODULES>);

  const categoryLabels: Record<string, string> = {
    core: "Core",
    management: "Gestione",
    tools: "Strumenti",
    reports: "Report",
    other: "Altro",
  };

  // Load permissions and data when dialog opens
  useEffect(() => {
    if (isOpen && userId) {
      loadData();
    }
  }, [isOpen, userId, domain]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch current permissions
      const permResponse = await fetch(
        `/api/sites/${domain}/users/${userId}/permissions`
      );
      if (!permResponse.ok) throw new Error("Failed to fetch permissions");
      const permData = await permResponse.json();
      
      setSelectedModules(new Set(permData.permissions.modules));
      setSelectedKanbans(new Set(permData.permissions.kanbans));
      setSelectedCategories(new Set(permData.permissions.kanban_categories));

      // Fetch all site modules (to know which are enabled at site level)
      const modulesResponse = await fetch(`/api/sites/${domain}/modules`);
      if (modulesResponse.ok) {
        const modulesData = await modulesResponse.json();
        const enabled = new Set<string>(
          modulesData.modules
            .filter((m: any) => m.isEnabled)
            .map((m: any) => m.name as string)
        );
        setEnabledSiteModules(enabled);
      }

      // Fetch kanbans (as admin we need all of them, not filtered)
      const kanbansResponse = await fetch(
        `/api/kanban/list?domain=${encodeURIComponent(domain)}`
      );
      if (kanbansResponse.ok) {
        const kanbansData = await kanbansResponse.json();
        setKanbans(Array.isArray(kanbansData) ? kanbansData : []);
      }

      // Fetch kanban categories
      const categoriesResponse = await fetch(
        `/api/kanban/categories?domain=${encodeURIComponent(domain)}`
      );
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setKanbanCategories(Array.isArray(categoriesData) ? categoriesData : []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati dei permessi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const permissions: UserPermissions = {
        modules: Array.from(selectedModules),
        kanbans: Array.from(selectedKanbans),
        kanban_categories: Array.from(selectedCategories),
      };

      const response = await fetch(
        `/api/sites/${domain}/users/${userId}/permissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(permissions),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save permissions");
      }

      toast({
        title: "Successo",
        description: "Permessi salvati con successo",
      });
      onClose();
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Impossibile salvare i permessi",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModule = (moduleName: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  };

  const toggleKanban = (kanbanId: number) => {
    setSelectedKanbans((prev) => {
      const next = new Set(prev);
      if (next.has(kanbanId)) {
        next.delete(kanbanId);
      } else {
        next.add(kanbanId);
      }
      return next;
    });
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleCategoryExpanded = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Get kanbans grouped by category
  const kanbansByCategory = kanbans.reduce((acc, kanban) => {
    const catId = kanban.category_id || 0;
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(kanban);
    return acc;
  }, {} as Record<number, Kanban[]>);

  // Select/deselect all modules
  const selectAllModules = () => {
    const allModules = AVAILABLE_MODULES.filter(
      (m) => enabledSiteModules.has(m.name)
    ).map((m) => m.name);
    setSelectedModules(new Set(allModules));
  };

  const deselectAllModules = () => {
    setSelectedModules(new Set());
  };

  // Select/deselect all kanbans
  const selectAllKanbans = () => {
    setSelectedKanbans(new Set(kanbans.map((k) => k.id)));
    setSelectedCategories(new Set(kanbanCategories.map((c) => c.id)));
  };

  const deselectAllKanbans = () => {
    setSelectedKanbans(new Set());
    setSelectedCategories(new Set());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Gestione Permessi</DialogTitle>
          <DialogDescription>
            Gestisci i permessi di accesso per <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="modules" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="modules">Moduli</TabsTrigger>
              <TabsTrigger value="kanbans">Kanban</TabsTrigger>
            </TabsList>

            <TabsContent value="modules" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Seleziona i moduli a cui l&apos;utente può accedere
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllModules}
                  >
                    Seleziona tutti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllModules}
                  >
                    Deseleziona tutti
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {Object.entries(modulesByCategory).map(
                    ([category, modules]) => (
                      <div key={category}>
                        <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                          {categoryLabels[category] || category}
                        </h4>
                        <div className="space-y-2">
                          {modules.map((module) => {
                            const isEnabledAtSite = enabledSiteModules.has(
                              module.name
                            );
                            return (
                              <div
                                key={module.name}
                                className={`flex items-center space-x-3 p-2 rounded-md ${
                                  !isEnabledAtSite
                                    ? "opacity-50 bg-muted"
                                    : "hover:bg-accent"
                                }`}
                              >
                                <Checkbox
                                  id={`module-${module.name}`}
                                  checked={selectedModules.has(module.name)}
                                  onCheckedChange={() =>
                                    toggleModule(module.name)
                                  }
                                  disabled={!isEnabledAtSite}
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`module-${module.name}`}
                                    className={`font-medium ${
                                      !isEnabledAtSite
                                        ? "text-muted-foreground"
                                        : ""
                                    }`}
                                  >
                                    {module.label}
                                  </Label>
                                  {!isEnabledAtSite && (
                                    <p className="text-xs text-muted-foreground">
                                      Modulo disabilitato per questo sito
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="kanbans" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Seleziona le kanban e categorie a cui l&apos;utente può
                  accedere
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllKanbans}
                  >
                    Seleziona tutti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllKanbans}
                  >
                    Deseleziona tutti
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {kanbanCategories.length > 0 ? (
                    <>
                      {kanbanCategories.map((category) => {
                        const categoryKanbans =
                          kanbansByCategory[category.id] || [];
                        const isExpanded = expandedCategories.has(category.id);

                        return (
                          <Collapsible
                            key={category.id}
                            open={isExpanded}
                            onOpenChange={() =>
                              toggleCategoryExpanded(category.id)
                            }
                          >
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Checkbox
                                    id={`category-${category.id}`}
                                    checked={selectedCategories.has(
                                      category.id
                                    )}
                                    onCheckedChange={() =>
                                      toggleCategory(category.id)
                                    }
                                  />
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{
                                      backgroundColor:
                                        category.color || "#6B7280",
                                    }}
                                  />
                                  <Label
                                    htmlFor={`category-${category.id}`}
                                    className="font-medium"
                                  >
                                    {category.name}
                                  </Label>
                                  <span className="text-xs text-muted-foreground">
                                    ({categoryKanbans.length} kanban)
                                  </span>
                                </div>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent>
                                {categoryKanbans.length > 0 && (
                                  <div className="mt-3 ml-8 space-y-2">
                                    {categoryKanbans.map((kanban) => (
                                      <div
                                        key={kanban.id}
                                        className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent"
                                      >
                                        <Checkbox
                                          id={`kanban-${kanban.id}`}
                                          checked={selectedKanbans.has(
                                            kanban.id
                                          )}
                                          onCheckedChange={() =>
                                            toggleKanban(kanban.id)
                                          }
                                        />
                                        <Label
                                          htmlFor={`kanban-${kanban.id}`}
                                          className="text-sm"
                                        >
                                          {kanban.title}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}

                      {/* Uncategorized kanbans */}
                      {kanbansByCategory[0] && kanbansByCategory[0].length > 0 && (
                        <div className="border rounded-lg p-3">
                          <h4 className="font-medium mb-3">Senza Categoria</h4>
                          <div className="space-y-2">
                            {kanbansByCategory[0].map((kanban) => (
                              <div
                                key={kanban.id}
                                className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent"
                              >
                                <Checkbox
                                  id={`kanban-${kanban.id}`}
                                  checked={selectedKanbans.has(kanban.id)}
                                  onCheckedChange={() =>
                                    toggleKanban(kanban.id)
                                  }
                                />
                                <Label
                                  htmlFor={`kanban-${kanban.id}`}
                                  className="text-sm"
                                >
                                  {kanban.title}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // No categories - show flat list
                    <div className="space-y-2">
                      {kanbans.map((kanban) => (
                        <div
                          key={kanban.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent"
                        >
                          <Checkbox
                            id={`kanban-${kanban.id}`}
                            checked={selectedKanbans.has(kanban.id)}
                            onCheckedChange={() => toggleKanban(kanban.id)}
                          />
                          <Label
                            htmlFor={`kanban-${kanban.id}`}
                            className="text-sm"
                          >
                            {kanban.title}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {kanbans.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Nessuna kanban disponibile
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Permessi"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
