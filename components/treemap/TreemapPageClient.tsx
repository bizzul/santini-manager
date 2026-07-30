"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { TreeDeciduous } from "lucide-react";
import TreemapFilters, {
  type TreemapFilterState,
} from "@/components/treemap/TreemapFilters";
import TreemapDrawer from "@/components/treemap/TreemapDrawer";
import TreemapMapSkeleton from "@/components/treemap/TreemapMapSkeleton";
import TreemapMapContextMenu, {
  type MapContextMenuState,
} from "@/components/treemap/TreemapMapContextMenu";
import TreemapAddAlberoDialog from "@/components/treemap/TreemapAddAlberoDialog";
import type { TreemapMapHandle } from "@/components/treemap/TreemapMap";
import type {
  TreemapAlberoMapRow,
  TreemapAlberoStatoResponse,
  TreemapPageData,
} from "@/lib/treemap-data";
import type { TmStatoSalute } from "@/lib/treemap/constants";
import { useToast } from "@/hooks/use-toast";

const TreemapMap = dynamic(() => import("@/components/treemap/TreemapMap"), {
  ssr: false,
  loading: () => <TreemapMapSkeleton />,
});

interface TreemapPageClientProps {
  data: TreemapPageData;
  domain: string;
}

export default function TreemapPageClient({
  data,
  domain,
}: TreemapPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const mapRef = React.useRef<TreemapMapHandle>(null);
  const [alberi, setAlberi] = React.useState(data.alberi);
  const [filters, setFilters] = React.useState<TreemapFilterState>({
    salute: [],
    tipiSensore: [],
    comune: null,
    clientId: null,
  });
  const [selectedAlbero, setSelectedAlbero] =
    React.useState<TreemapAlberoMapRow | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerData, setDrawerData] =
    React.useState<TreemapAlberoStatoResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const [drawerError, setDrawerError] = React.useState<string | null>(null);
  const [contextMenu, setContextMenu] =
    React.useState<MapContextMenuState | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [addCoords, setAddCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

  React.useEffect(() => {
    setAlberi((prev) => {
      const merged = new Map<string, TreemapAlberoMapRow>();
      for (const a of data.alberi) merged.set(a.albero_id, a);
      for (const a of prev) {
        if (!merged.has(a.albero_id)) merged.set(a.albero_id, a);
      }
      return Array.from(merged.values()).sort((a, b) =>
        a.codice.localeCompare(b.codice),
      );
    });
  }, [data.alberi]);

  const comuni = React.useMemo(
    () => Array.from(new Set(alberi.map((a) => a.comune))).sort(),
    [alberi],
  );

  const allCounts = React.useMemo(() => {
    const c: Record<TmStatoSalute, number> = {
      VERDE: 0,
      GIALLO: 0,
      ROSSO: 0,
      OFFLINE: 0,
      SCONOSCIUTO: 0,
    };
    for (const a of alberi) c[a.stato_salute] += 1;
    return c;
  }, [alberi]);

  const filteredAlberi = React.useMemo(() => {
    return alberi.filter((a) => {
      if (filters.comune && a.comune !== filters.comune) return false;
      if (filters.clientId != null && a.client_id !== filters.clientId)
        return false;
      if (
        filters.salute.length > 0 &&
        !filters.salute.includes(a.stato_salute)
      ) {
        return false;
      }
      if (filters.tipiSensore.length > 0) {
        const hasTipo = filters.tipiSensore.some((t) =>
          a.tipi_sensore.includes(t),
        );
        if (!hasTipo) return false;
      }
      return true;
    });
  }, [alberi, filters]);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        "[treemap] filtrati:",
        filteredAlberi.length,
        "di",
        alberi.length,
      );
    }
  }, [filteredAlberi.length, alberi.length]);

  const loadDrawer = React.useCallback(
    async (albero: TreemapAlberoMapRow) => {
      setDrawerLoading(true);
      setDrawerError(null);
      setDrawerData(null);
      try {
        const res = await fetch(
          `/api/sites/${domain}/treemap/alberi/${albero.albero_id}/stato`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Impossibile caricare i sensori");
        }
        const payload = (await res.json()) as TreemapAlberoStatoResponse;
        setDrawerData(payload);
      } catch (err) {
        setDrawerError(
          err instanceof Error ? err.message : "Errore di rete",
        );
      } finally {
        setDrawerLoading(false);
      }
    },
    [domain],
  );

  const handleSelectAlbero = React.useCallback(
    (albero: TreemapAlberoMapRow, _markerEl: HTMLElement | null) => {
      setContextMenu(null);
      setSelectedAlbero(albero);
      setDrawerOpen(true);
      void loadDrawer(albero);
    },
    [loadDrawer],
  );

  const handleDrawerOpenChange = React.useCallback(
    (open: boolean) => {
      setDrawerOpen(open);
      if (!open) {
        const focusId = selectedAlbero?.albero_id ?? null;
        setSelectedAlbero(null);
        setDrawerData(null);
        setDrawerError(null);
        if (focusId) {
          requestAnimationFrame(() => mapRef.current?.focusMarker(focusId));
        }
      }
    },
    [selectedAlbero],
  );

  const handleRetry = React.useCallback(() => {
    if (selectedAlbero) void loadDrawer(selectedAlbero);
  }, [selectedAlbero, loadDrawer]);

  const handleMapContextMenu = React.useCallback((menu: MapContextMenuState) => {
    setContextMenu(menu);
  }, []);

  const handleAddAlberoFromMenu = React.useCallback(
    (coords: { lat: number; lng: number }) => {
      setAddCoords(coords);
      setAddDialogOpen(true);
    },
    [],
  );

  const handleAlberoCreated = React.useCallback(
    (albero: TreemapAlberoMapRow) => {
      setAlberi((prev) => {
        const next = prev.filter((a) => a.albero_id !== albero.albero_id);
        next.push(albero);
        return next.sort((a, b) => a.codice.localeCompare(b.codice));
      });
      setFilters({
        salute: [],
        tipiSensore: [],
        comune: null,
        clientId: null,
      });
      toast({
        title: "Albero aggiunto",
        description: `${albero.codice} — ${albero.specie_comune}`,
      });
      router.refresh();
    },
    [router, toast],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
          <TreeDeciduous className="h-5 w-5 text-emerald-600" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Treemap</h1>
          <p className="text-sm text-muted-foreground">
            Monitoraggio alberi urbani con sensori IoT — Canton Ticino
          </p>
        </div>
      </div>

      <TreemapFilters
        filters={filters}
        onChange={setFilters}
        comuni={comuni}
        clienti={data.clienti}
        counts={allCounts}
      />

      <TreemapMap
        ref={mapRef}
        alberi={alberi}
        selectedAlberoId={selectedAlbero?.albero_id ?? null}
        drawerOpen={drawerOpen}
        onSelectAlbero={handleSelectAlbero}
        onMapContextMenu={handleMapContextMenu}
      />

      <p className="text-sm text-muted-foreground">
        {filteredAlberi.length} di {alberi.length} alberi visibili · tasto
        destro sulla mappa per aggiungere un albero
      </p>

      <TreemapMapContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddAlbero={handleAddAlberoFromMenu}
      />

      <TreemapAddAlberoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        domain={domain}
        coords={addCoords}
        onCreated={handleAlberoCreated}
      />

      <TreemapDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        domain={domain}
        alberoSummary={selectedAlbero}
        data={drawerData}
        loading={drawerLoading}
        error={drawerError}
        onRetry={handleRetry}
      />
    </div>
  );
}
