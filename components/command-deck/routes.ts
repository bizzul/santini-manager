/**
 * Centralized route map for the Command Deck nodes.
 */

import type { CommandDeckNode } from "./nodes";
import type { DrillState, OrbitItem } from "./orbit-items";

export const COMMAND_DECK_ROUTE_MAP: Record<string, string> = {
  fabbrica: "/factory",
  clienti: "/clients",
  fornitori: "/suppliers",
  prodotti: "/products",
  progetti: "/progetti",
  inventario: "/inventory",
  admin: "/collaborators",
};

export function buildModuleHref(
  domain: string,
  nodeId: string,
): string | null {
  const relative = COMMAND_DECK_ROUTE_MAP[nodeId];
  if (!relative) return null;
  return `/sites/${domain}${relative}`;
}

export function buildModuleHrefForNode(
  domain: string,
  node: CommandDeckNode,
): string | null {
  return buildModuleHref(domain, node.id);
}

export interface ResolveOrbitHrefOptions {
  userRole?: string | null;
}

/**
 * Resolve the "open" destination for an orbit badge at any drill level.
 * Returns `null` when no safe route exists.
 */
export function resolveOrbitOpenHref(
  domain: string,
  moduleId: string,
  item: OrbitItem,
  opts: ResolveOrbitHrefOptions = {},
): string | null {
  if (item.href) return item.href;

  const base = `/sites/${domain}`;
  const kind = item.kind ?? "entity";
  const role = opts.userRole;

  if (kind === "category") {
    if (moduleId === "prodotti") return `${base}/product-categories`;
    if (moduleId === "inventario") return `${base}/categories`;
    return buildModuleHref(domain, moduleId);
  }

  if (kind === "subcategory") {
    return buildModuleHref(domain, moduleId);
  }

  if (kind === "activity") {
    const mod = item.moduleId ?? moduleId;
    return buildModuleHref(domain, mod) ?? `${base}/home`;
  }

  // entity (default)
  switch (moduleId) {
    case "progetti":
      if (role === "admin" || role === "superadmin") {
        return `${base}/progetti/${item.id}`;
      }
      return `${base}/projects?edit=${item.id}`;
    case "clienti":
      return `${base}/clients?edit=${item.id}`;
    case "prodotti":
      return `${base}/products/${item.id}`;
    case "inventario":
      return `${base}/inventory`;
    case "fornitori":
      return `${base}/suppliers`;
    case "fabbrica":
      return `${base}/factory`;
    case "admin":
      return `${base}/collaborators`;
    default:
      return buildModuleHref(domain, moduleId);
  }
}

/** Session storage key for persisting deck camera/selection state per site. */
export function deckStateStorageKey(domain: string): string {
  return `command-deck-state:${domain}`;
}

export interface PersistedDeckState {
  selectedId: string | null;
  drill: DrillState;
  mode: "galaxy" | "focus";
  selectedOrbitItemId: string | null;
}

export function loadPersistedDeckState(
  domain: string,
): PersistedDeckState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(deckStateStorageKey(domain));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedDeckState;
  } catch {
    return null;
  }
}

export function savePersistedDeckState(
  domain: string,
  state: PersistedDeckState,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(deckStateStorageKey(domain), JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}
