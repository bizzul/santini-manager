"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  getKanbanCategories,
  type KanbanCategory,
} from "@/app/sites/[domain]/kanban/actions/get-kanban-categories.action";
import { Folder } from "lucide-react";

interface KanbanCategorySelectorProps {
  domain: string;
  value?: number | null;
  onChange: (categoryId: number | null) => void;
  disabled?: boolean;
}

export function KanbanCategorySelector({
  domain,
  value,
  onChange,
  disabled,
}: KanbanCategorySelectorProps) {
  const [categories, setCategories] = useState<KanbanCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor="category">Categoria</Label>
      <Select
        value={value?.toString() || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : parseInt(val))}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="category">
          <SelectValue placeholder="Seleziona una categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Nessuna categoria</span>
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center"
                  style={{ backgroundColor: category.color || "#3B82F6" }}
                >
                  <Folder className="w-3 h-3 text-white" />
                </div>
                {category.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

