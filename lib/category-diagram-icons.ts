/**
 * Maps a category/subcategory to a Kanban-icon-map lucide name for diagram
 * sector headers. Prefers an explicitly stored icon (when valid), otherwise
 * derives one from the category name via keyword matching.
 *
 * All returned names are guaranteed to exist in `KANBAN_ICON_MAP`
 * (see `lib/kanban-icons.ts`); unknown names fall back to "Folder".
 */
import { KANBAN_ICON_MAP } from "@/lib/kanban-icons";

const NAME_RULES: Array<{ test: RegExp; icon: string }> = [
  { test: /arredament|mobil/, icon: "Armchair" },
  { test: /legn|wood/, icon: "TreeDeciduous" },
  { test: /port|door/, icon: "KeyRound" },
  { test: /serrament|finestr|infiss|bord/, icon: "Layout" },
  { test: /vernic|pittur|colore|paint/, icon: "Brush" },
  { test: /montagg|assembl/, icon: "Drill" },
  { test: /ferrament|hardware/, icon: "Wrench" },
  { test: /utensil|attrezz|tool/, icon: "Hammer" },
  { test: /macchinar|machine|impiant/, icon: "Factory" },
  { test: /veicol|vehicle|auto|mezzi/, icon: "Truck" },
  { test: /dispositiv|protezion|sicurezz|dpi|safety/, icon: "Siren" },
  { test: /posa/, icon: "Shovel" },
  { test: /accessor/, icon: "Package" },
  { test: /service|assistenz|manutenz/, icon: "Settings" },
  { test: /vari|misc|altro/, icon: "Boxes" },
];

/**
 * Returns a valid lucide icon name for a category.
 * @param name category display name
 * @param storedIcon optional icon already saved on the category
 */
export function categoryIconName(
  name: string | null | undefined,
  storedIcon?: string | null,
): string {
  if (storedIcon && KANBAN_ICON_MAP[storedIcon]) {
    return storedIcon;
  }

  const normalized = (name ?? "").toLowerCase().trim();
  for (const rule of NAME_RULES) {
    if (rule.test.test(normalized)) {
      return rule.icon;
    }
  }
  return "Folder";
}
