import Link from "next/link";
import { BarChart3, ListChecks, TrendingUp } from "lucide-react";
import { requirePersonalContext } from "@/lib/personal-manager/server-context";
import { getLatestScores, getOpenItemCounts } from "@/lib/personal-manager/queries";
import { LifeWheel } from "@/components/personal-manager/LifeWheel";
import { CategoryChips, PmScreenHeader } from "@/components/personal-manager/MobileShell";
import type { AreaSlug } from "@/lib/personal-manager/types";

export const dynamic = "force-dynamic";

export default async function PersonalManagerHome() {
  const ctx = await requirePersonalContext();
  const [scores, openCounts] = await Promise.all([
    getLatestScores(ctx.userId),
    getOpenItemCounts(ctx.userId),
  ]);

  // Aggrega solo sulle aree visibili all'utente.
  const visibleScores = ctx.areasVisible
    .map((slug) => scores[slug])
    .filter((v): v is number => typeof v === "number");
  const avgScore =
    visibleScores.length > 0
      ? (visibleScores.reduce((a, b) => a + b, 0) / visibleScores.length).toFixed(1)
      : "–";
  const totalOpen = ctx.areasVisible.reduce(
    (sum, slug) => sum + (openCounts[slug] ?? 0),
    0,
  );

  const wheelData: Record<string, { score?: number; openCount?: number }> = {};
  for (const slug of ctx.areasVisible) {
    wheelData[slug] = {
      score: scores[slug as AreaSlug],
      openCount: openCounts[slug as AreaSlug],
    };
  }

  return (
    <div>
      <CategoryChips items={[{ label: "Trasversale · 8 aree" }]} />
      <PmScreenHeader
        title="Wheel of Life"
        subtitle="Tocca uno spicchio per aprire l'area"
      />

      <div className="rounded-2xl border border-border bg-card p-3">
        <LifeWheel data={wheelData} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-muted-foreground" />
          <div className="mt-1 text-lg font-extrabold text-foreground">
            {avgScore}
          </div>
          <div className="text-[10px] text-muted-foreground">Media aree</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <ListChecks className="mx-auto h-4 w-4 text-muted-foreground" />
          <div className="mt-1 text-lg font-extrabold text-foreground">
            {totalOpen}
          </div>
          <div className="text-[10px] text-muted-foreground">Item aperti</div>
        </div>
        <Link
          href="/personale/report"
          className="rounded-xl border border-border bg-card p-3 text-center transition-colors hover:bg-muted"
        >
          <BarChart3 className="mx-auto h-4 w-4 text-muted-foreground" />
          <div className="mt-1 text-lg font-extrabold text-foreground">
            {ctx.areasVisible.length}
          </div>
          <div className="text-[10px] text-muted-foreground">Report</div>
        </Link>
      </div>

      {ctx.areasVisible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
          Nessuna area attiva. Chiedi a un superadmin di riabilitare il
          Manager Personale per ripristinare le tue aree.
        </p>
      ) : null}
    </div>
  );
}
