import { notFound } from "next/navigation";
import {
  areaPermissions,
  requirePmContext,
} from "@/lib/personal-manager/server-context";
import {
  getItems,
  getLatestScores,
  getScoreHistory,
} from "@/lib/personal-manager/queries";
import { AreaHub } from "@/components/personal-manager/AreaHub";
import { getAreaDef, isAreaSlug } from "@/lib/personal-manager/types";

export const dynamic = "force-dynamic";

export default async function AreaHubPage({
  params,
}: {
  params: Promise<{ domain: string; slug: string }>;
}) {
  const { domain, slug } = await params;
  if (!isAreaSlug(slug)) notFound();

  const ctx = await requirePmContext(domain);

  // Enforcement permessi: area non visibile o senza read -> 404 (non solo UI).
  const perms = areaPermissions(ctx, slug);
  if (!ctx.areasVisible.includes(slug) || !perms.read) {
    notFound();
  }

  const area = getAreaDef(slug);
  if (!area) notFound();

  const [scores, scoreHistory, items] = await Promise.all([
    getLatestScores(ctx.siteId, ctx.userId),
    getScoreHistory(ctx.siteId, ctx.userId, slug),
    getItems(ctx.siteId, ctx.userId, { area: slug, includeDone: true }),
  ]);

  return (
    <AreaHub
      area={area}
      currentScore={scores[slug]}
      scoreHistory={scoreHistory}
      items={items}
      permissions={perms}
    />
  );
}
