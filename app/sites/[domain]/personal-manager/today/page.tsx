import { CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import {
  areaPermissions,
  requirePmContext,
} from "@/lib/personal-manager/server-context";
import { getItems } from "@/lib/personal-manager/queries";
import { ItemCard } from "@/components/personal-manager/ItemCard";
import { CategoryChips, PmScreenHeader } from "@/components/personal-manager/MobileShell";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const ctx = await requirePmContext(domain);

  const items =
    ctx.areasVisible.length > 0
      ? await getItems(ctx.siteId, ctx.userId, { areas: ctx.areasVisible })
      : [];

  return (
    <div>
      <CategoryChips items={[{ label: "Trasversale · priorita' del giorno" }]} />
      <PmScreenHeader
        title="Today"
        subtitle="I tuoi dati fondamentali per priorita'"
      />

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              showArea
              canEdit={areaPermissions(ctx, item.area_slug).edit}
            />
          ))
        ) : (
          <EmptyState
            icon={<CalendarCheck className="h-6 w-6" />}
            title="Tutto in ordine"
            description="Non ci sono elementi prioritari da gestire oggi."
          />
        )}
      </div>
    </div>
  );
}
