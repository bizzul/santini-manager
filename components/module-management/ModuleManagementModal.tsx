"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Settings,
  Loader2,
  LayoutDashboard,
  Kanban,
  FolderKanban,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  BarChart3,
  CheckSquare,
  Package,
  Warehouse,
  ShoppingBag,
  Truck,
  Factory,
  UserCog,
  List,
  LucideIcon,
  Layers,
  Wrench,
  FileText,
  Cog,
} from "lucide-react";
import { ModuleConfig } from "@/lib/module-config";
import {
  getSiteModules,
  updateSiteModules,
} from "@/app/(administration)/administration/actions";

interface ModuleManagementModalProps {
  siteId: string;
  trigger?: React.ReactNode;
}

interface ModuleWithStatus extends ModuleConfig {
  isEnabled: boolean;
}

// Map module icons to Lucide icons
const getModuleIcon = (iconName: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    faWaveSquare: LayoutDashboard,
    faTable: Kanban,
    faKanban: FolderKanban,
    faClock: Clock,
    faUser: Users,
    faExclamation: AlertTriangle,
    faSquarePollVertical: BarChart3,
    faCheckSquare: CheckSquare,
    faBox: Package,
    faWarehouse: Warehouse,
    faShoppingBag: ShoppingBag,
    faHelmetSafety: Truck,
    faIndustry: Factory,
    faUserTie: UserCog,
    faListUl: List,
  };
  return iconMap[iconName] || Package;
};

// Category configuration with icons and colors
const categoryConfig: Record<
  string,
  { icon: LucideIcon; color: string; bgColor: string; label: string }
> = {
  core: {
    icon: Layers,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    label: "Core",
  },
  management: {
    icon: Cog,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    label: "Gestione",
  },
  reports: {
    icon: FileText,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    label: "Report",
  },
  tools: {
    icon: Wrench,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    label: "Strumenti",
  },
};

export default function ModuleManagementModal({
  siteId,
  trigger,
}: ModuleManagementModalProps) {
  const [open, setOpen] = useState(false);
  const [modules, setModules] = useState<ModuleWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSiteModules(siteId);
      setModules(data.modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i moduli",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [siteId, toast]);

  useEffect(() => {
    if (open) {
      fetchModules();
    }
  }, [open, fetchModules]);

  const handleModuleToggle = (moduleName: string, enabled: boolean) => {
    setModules((prev) =>
      prev.map((module) =>
        module.name === moduleName ? { ...module, isEnabled: enabled } : module
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSiteModules(siteId, modules);

      toast({
        title: "Successo",
        description: "Moduli aggiornati con successo",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error updating modules:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare i moduli";
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderModuleCard = (module: ModuleWithStatus) => {
    const IconComponent = getModuleIcon(module.icon);
    const category = categoryConfig[module.category || "tools"];

    return (
      <Card
        key={module.name}
        className={`bg-white/5 border-white/20 transition-all duration-200 ${
          module.isEnabled ? "ring-1 ring-white/20" : "opacity-70"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.bgColor}`}
              >
                <IconComponent className={`w-5 h-5 ${category.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium text-white">
                  {module.label}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-xs mt-1 border-white/20 ${category.color}`}
                >
                  {category.label}
                </Badge>
              </div>
            </div>
            <Switch
              checked={module.isEnabled}
              onCheckedChange={(enabled: boolean) =>
                handleModuleToggle(module.name, enabled)
              }
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-white/60 line-clamp-2">
            {module.description}
          </p>
        </CardContent>
      </Card>
    );
  };

  const renderCategorySection = (
    category: string,
    categoryModules: ModuleWithStatus[]
  ) => {
    const config = categoryConfig[category];
    const CategoryIcon = config.icon;
    const enabledCount = categoryModules.filter((m) => m.isEnabled).length;

    return (
      <div key={category} className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}
          >
            <CategoryIcon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              {config.label}
            </h3>
          </div>
          <Badge variant="outline" className="border-white/20 text-white/70">
            {enabledCount}/{categoryModules.length} attivi
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {categoryModules.map(renderModuleCard)}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Gestisci Moduli
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Gestione Moduli
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Abilita o disabilita i moduli per questo sito. Le modifiche
            influenzeranno le funzionalità disponibili per gli utenti.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        ) : (
          <div className="space-y-8 py-4">
            {["core", "management", "reports", "tools"].map((category) => {
              const categoryModules = modules.filter(
                (m) => m.category === category
              );
              if (categoryModules.length === 0) return null;
              return renderCategorySection(category, categoryModules);
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-white/30 text-white hover:bg-white/10"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Modifiche"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
