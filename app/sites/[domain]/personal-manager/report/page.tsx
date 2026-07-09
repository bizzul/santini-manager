import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { requirePmContext } from "@/lib/personal-manager/server-context";
import { getLatestScores } from "@/lib/personal-manager/queries";
import { BalanceRadar } from "@/components/personal-manager/BalanceRadar";
import { CategoryChips, PmScreenHeader } from "@/components/personal-manager/MobileShell";
import { getAreaDef } from "@/lib/personal-manager/types";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const ctx = await requirePmContext(domain);
  const scores = await getLatestScores(ctx.siteId, ctx.userId);

  const rows = ctx.areasVisible.map((slug) => ({
    slug,
    label: getAreaDef(slug)?.label ?? slug,
    accent: getAreaDef(slug)?.accent ?? "#6b7280",
    score: scores[slug] ?? 0,
    hasScore: typeof scores[slug] === "number",
  }));

  const scored = rows.filter((r) => r.hasScore);
  const avg =
    scored.length > 0
      ? scored.reduce((a, b) => a + b.score, 0) / scored.length
      : 0;
  // Squilibri: aree sotto la media di piu' di 2 punti.
  const weakest = [...scored]
    .filter((r) => r.score < avg - 2)
    .sort((a, b) => a.score - b.score);

  return (
    <div>
      <CategoryChips items={[{ label: "Trasversale · tutte le 8 aree" }]} />
      <PmScreenHeader
        title="Bilanciamento vita"
        subtitle="Confronto dei punteggi tra aree"
      />

      {rows.length > 0 ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-3">
            <BalanceRadar
              categories={rows.map((r) => r.label)}
              scores={rows.map((r) => r.score)}
            />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card p-3">
            <p className="text-sm font-semibold text-foreground">
              Media complessiva:{" "}
              <span className="font-extrabold">{avg.toFixed(1)}/10</span>
            </p>
            {weakest.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Aree da rinforzare:</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {weakest.map((r) => (
                    <span
                      key={r.slug}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: `${r.accent}22`, color: r.accent }}
                    >
                      {r.label} · {r.score}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Buon equilibrio: nessuna area significativamente sotto la media.
              </p>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Nessun dato"
          description="Registra i punteggi delle aree per vedere il bilanciamento."
        />
      )}
    </div>
  );
}
