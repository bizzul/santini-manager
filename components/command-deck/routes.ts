/**
 * Centralized route map for the Command Deck nodes.
 *
 * Single source of truth: every navigation affordance (CTA in the selected
 * panel, future double-click shortcut, deep-link badges…) resolves the
 * target through `buildModuleHref()` so we never drift between nodes.ts
 * metadata and actual site-scoped paths.
 *
 * All paths below have been verified to exist as folders under
 * `app/sites/[domain]/` so the final URL is guaranteed to be renderable.
 */

import type { CommandDeckNode } from "./nodes";

/**
 * Node id → relative path inside `/sites/[domain]`.
 *
 * Route choices:
 *  - fabbrica   → /factory        (factory floor / production area)
 *  - clienti    → /clients        (customer registry)
 *  - fornitori  → /suppliers      (supplier registry; NOT manufacturers)
 *  - prodotti   → /products       (sell products catalog)
 *  - progetti   → /progetti       (projects; italian alias, matches the
 *                                  italian label used in the UI)
 *  - inventario → /inventory      (warehouse & stock)
 *  - admin      → /collaborators  (user/role/permissions admin — the most
 *                                  universally-accessible site-scoped admin
 *                                  entry; the `/administration/...` area is
 *                                  outside the [domain] tree and gated to
 *                                  admin/superadmin only)
 */
export const COMMAND_DECK_ROUTE_MAP: Record<string, string> = {
  fabbrica: "/factory",
  clienti: "/clients",
  fornitori: "/suppliers",
  prodotti: "/products",
  progetti: "/progetti",
  inventario: "/inventory",
  admin: "/collaborators",
};

/**
 * Build the absolute path for a given node in the context of a site domain.
 * Returns `null` if the node id is not registered in the map (defensive:
 * keeps us from producing broken URLs if a new node is added without an
 * explicit route decision).
 */
export function buildModuleHref(
  domain: string,
  nodeId: string,
): string | null {
  const relative = COMMAND_DECK_ROUTE_MAP[nodeId];
  if (!relative) return null;
  return `/sites/${domain}${relative}`;
}

/** Convenience helper used by the overlay when rendering the selected node. */
export function buildModuleHrefForNode(
  domain: string,
  node: CommandDeckNode,
): string | null {
  return buildModuleHref(domain, node.id);
}
