import { EmptyState } from "@/components/layout/empty-state";
import { ListTodo } from "lucide-react";
import { CategoryChips } from "@/components/personal-manager/MobileShell";
import { ScoreDial } from "@/components/personal-manager/ScoreDial";
import { ItemCard } from "@/components/personal-manager/ItemCard";
import { ItemCreateDialog } from "@/components/personal-manager/ItemCreateDialog";
import { AREA_HUB_CONFIG } from "@/components/personal-manager/area-config";
import {
  getAreaDef,
  type AreaPermissions,
  type LifeAreaDef,
  type PmItem,
} from "@/lib/personal-manager/types";

interface AreaHubProps {
  area: LifeAreaDef;
  currentScore?: number;
  items: PmItem[];
  permissions: AreaPermissions;
}

export function AreaHub({
  area,
  currentScore,
  items,
  permissions,
}: AreaHubProps) {
  const config = AREA_HUB_CONFIG[area.slug];
  const openItems = items.filter((i) => i.status !== "done");
  const doneCount = items.length - openItems.length;

  return (
    <div>
      <CategoryChips
        items={[
          { label: area.label, color: area.accent },
          ...config.correlations.map((slug) => {
            const c = getAreaDef(slug);
            return { label: c?.label ?? slug, color: c?.accent };
          }),
        ]}
      />

      {/* Header area */}
      <div
        className="rounded-2xl p-4 text-white"
        style={{ backgroundColor: area.accent }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{area.label}</h1>
            <p className="mt-0.5 text-sm text-white/85">{config.purpose}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold leading-none">
              {currentScore ?? "–"}
            </div>
            <div className="text-[11px] text-white/80">/ 10</div>
          </div>
        </div>
      </div>

      {/* Autovalutazione */}
      <div className="mt-4">
        <ScoreDial
          area={area.slug}
          accent={area.accent}
          current={currentScore}
          canEdit={permissions.edit}
        />
      </div>

      {/* Widget riepilogativi */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {config.widgets.map((widget) => (
          <div
            key={widget.title}
            className="rounded-xl border border-border bg-card p-3"
          >
            <p className="text-sm font-semibold text-foreground">
              {widget.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {widget.hint}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">Item aperti</p>
          <p className="mt-0.5 text-2xl font-extrabold" style={{ color: area.accent }}>
            {openItems.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">Completati</p>
          <p className="mt-0.5 text-2xl font-extrabold text-muted-foreground">
            {doneCount}
          </p>
        </div>
      </div>

      {/* Lista item + CTA */}
      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Elementi dell&apos;area
        </h2>
        {permissions.create ? (
          <ItemCreateDialog
            area={area.slug}
            label={config.createLabel}
            accent={area.accent}
          />
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {openItems.length > 0 ? (
          openItems.map((item) => (
            <ItemCard key={item.id} item={item} canEdit={permissions.edit} />
          ))
        ) : (
          <EmptyState
            icon={<ListTodo className="h-6 w-6" />}
            title="Nessun elemento"
            description={
              permissions.create
                ? "Aggiungi il primo elemento con il pulsante qui sopra."
                : "Non ci sono elementi in questa area."
            }
          />
        )}
      </div>
    </div>
  );
}
