import { notFound } from "next/navigation";
import {
  areaPermissions,
  requirePersonalContext,
} from "@/lib/personal-manager/server-context";
import { getItems, getLatestScores } from "@/lib/personal-manager/queries";
import { AreaHub } from "@/components/personal-manager/AreaHub";
import { getAreaDef, isAreaSlug } from "@/lib/personal-manager/types";

export const dynamic = "force-dynamic";

export default async function AreaHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isAreaSlug(slug)) notFound();

  const ctx = await requirePersonalContext();

  // Enforcement: area non attiva -> 404 (non solo UI).
  const perms = areaPermissions(ctx, slug);
  if (!ctx.areasVisible.includes(slug) || !perms.read) {
    notFound();
  }

  const area = getAreaDef(slug);
  if (!area) notFound();

  const [scores, items] = await Promise.all([
    getLatestScores(ctx.userId),
    getItems(ctx.userId, { area: slug, includeDone: true }),
  ]);

  return (
    <AreaHub
      area={area}
      currentScore={scores[slug]}
      items={items}
      permissions={perms}
    />
  );
}
