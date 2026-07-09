import { Workflow } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { requirePmContext } from "@/lib/personal-manager/server-context";
import { getAutomations } from "@/lib/personal-manager/queries";
import { AutomationTimeline } from "@/components/personal-manager/AutomationTimeline";
import { CategoryChips, PmScreenHeader } from "@/components/personal-manager/MobileShell";

export const dynamic = "force-dynamic";

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const ctx = await requirePmContext(domain);
  const all = await getAutomations(ctx.siteId);

  // Mostra le automazioni trasversali (senza area) e quelle delle aree visibili.
  const automations = all.filter(
    (a) => !a.area_slug || ctx.areasVisible.includes(a.area_slug),
  );

  return (
    <div>
      <CategoryChips items={[{ label: "Trasversale · integrazioni" }]} />
      <PmScreenHeader
        title="Automazioni"
        subtitle="Piano di integrazione delle sorgenti dati"
      />

      {automations.length > 0 ? (
        <AutomationTimeline automations={automations} />
      ) : (
        <EmptyState
          icon={<Workflow className="h-6 w-6" />}
          title="Nessuna automazione"
          description="Le integrazioni pianificate compariranno qui."
        />
      )}
    </div>
  );
}
