import { notFound } from "next/navigation";
import {
  areaPermissions,
  requirePersonalContext,
} from "@/lib/personal-manager/server-context";
import { getItemById, getItemSnapshots } from "@/lib/personal-manager/queries";
import { ItemDetail } from "@/components/personal-manager/ItemDetail";
import type { PmItem, PmItemSnapshot } from "@/lib/personal-manager/types";

export const dynamic = "force-dynamic";

/** Euristica semplice per la stima di completamento (nessun giudizio clinico). */
function buildProjection(item: PmItem, snapshots: PmItemSnapshot[]): string {
  if (item.status === "done") {
    return "Completato";
  }
  if (item.due_date) {
    const due = new Date(item.due_date);
    const diffDays = Math.ceil(
      (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) return `In ritardo di ${Math.abs(diffDays)} giorni`;
    if (diffDays === 0) return "In scadenza oggi";
    return `Prevista tra ${diffDays} giorni (${due.toLocaleDateString("it-IT")})`;
  }
  // Senza scadenza: stima grezza da priorita' (piu' alta -> prima) e attivita'.
  const baseDays = (6 - item.priority) * 7;
  const est = new Date();
  est.setDate(est.getDate() + Math.max(3, baseDays));
  return `Stima ~${Math.max(3, baseDays)} giorni (${est.toLocaleDateString("it-IT")})`;
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requirePersonalContext();

  const item = await getItemById(ctx.userId, id);
  if (!item) notFound();

  // Enforcement: l'area dell'item dev'essere visibile e leggibile.
  const perms = areaPermissions(ctx, item.area_slug);
  if (!ctx.areasVisible.includes(item.area_slug) || !perms.read) {
    notFound();
  }

  const snapshots = await getItemSnapshots(ctx.userId, id);

  return (
    <ItemDetail
      item={item}
      snapshots={snapshots}
      canEdit={perms.edit}
      projection={buildProjection(item, snapshots)}
    />
  );
}
