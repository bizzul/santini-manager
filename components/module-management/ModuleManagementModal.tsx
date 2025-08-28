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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Settings, CheckCircle, XCircle } from "lucide-react";
import {
  ModuleConfig,
  AVAILABLE_MODULES,
  getModulesByCategory,
} from "@/lib/module-config";
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
        title: "Error",
        description: "Failed to load modules",
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
        title: "Success",
        description: "Modules updated successfully",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error updating modules:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update modules";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "core":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "management":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "reports":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "tools":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const renderModuleCard = (module: ModuleWithStatus) => (
    <Card key={module.name} className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {module.isEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <CardTitle className="text-sm">{module.label}</CardTitle>
            </div>
            <Badge
              className={`text-xs ${getCategoryColor(module.category || "")}`}
            >
              {module.category}
            </Badge>
          </div>
          <Checkbox
            checked={module.isEnabled}
            onCheckedChange={(enabled: boolean) =>
              handleModuleToggle(module.name, enabled)
            }
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-xs">
          {module.description}
        </CardDescription>
      </CardContent>
    </Card>
  );

  const renderCategorySection = (
    category: string,
    categoryModules: ModuleWithStatus[]
  ) => (
    <div key={category} className="space-y-3">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold capitalize">{category}</h3>
        <Badge variant="secondary">{categoryModules.length}</Badge>
      </div>
      <div className="grid gap-3">{categoryModules.map(renderModuleCard)}</div>
      <Separator />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage Modules
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Site Modules</DialogTitle>
          <DialogDescription>
            Enable or disable modules for this site. Changes will affect what
            features are available to users.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {["core", "management", "reports", "tools"].map((category) => {
              const categoryModules = modules.filter(
                (m) => m.category === category
              );
              if (categoryModules.length === 0) return null;
              return renderCategorySection(category, categoryModules);
            })}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
