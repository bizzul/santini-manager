import { Database } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { requirePersonalContext } from "@/lib/personal-manager/server-context";
import { getDataSources } from "@/lib/personal-manager/queries";
import { DataSourceList } from "@/components/personal-manager/DataSourceList";
import { CategoryChips, PmScreenHeader } from "@/components/personal-manager/MobileShell";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requirePersonalContext();
  const sources = await getDataSources(ctx.userId);

  return (
    <div>
      <CategoryChips items={[{ label: "Trasversale · sorgenti dati" }]} />
      <PmScreenHeader
        title="Impostazioni"
        subtitle="Sorgenti che alimentano le tue aree"
      />

      {sources.length > 0 ? (
        <DataSourceList sources={sources} />
      ) : (
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title="Nessuna sorgente"
          description="Le sorgenti dati configurate compariranno qui."
        />
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Nessuna credenziale o segreto viene mostrato in questa schermata.
      </p>
    </div>
  );
}
