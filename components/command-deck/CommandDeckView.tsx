"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { COMMAND_DECK_NODES, type CommandDeckNode } from "./nodes";
import {
  buildModuleHref,
  loadPersistedDeckState,
  resolveOrbitOpenHref,
  savePersistedDeckState,
} from "./routes";
import type { CommandDeckMode } from "./CommandDeckScene";
import {
  buildOrbitSet,
  getDrillBreadcrumb,
  moduleHasDrill,
  resolveActiveOrbitItems,
  type DrillState,
  type ModuleDrillGroups,
  type OrbitGroups,
  type OrbitItem,
  type OrbitSet,
} from "./orbit-items";
import { ViewSwitch } from "./ViewSwitch";

const CommandDeckScene = dynamic(
  () => import("./CommandDeckScene").then((m) => m.CommandDeckScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-page-shadow text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span className="animate-pulse">Initializing command deck…</span>
      </div>
    ),
  },
);

interface CommandDeckViewProps {
  siteName: string;
  domain: string;
  commanderName: string;
  commanderRole?: string | null;
  commanderAvatarUrl?: string | null;
  orbitGroups: OrbitGroups;
  drillGroups?: ModuleDrillGroups;
  enableModuleOpen?: boolean;
}

const NAV_FADE_DURATION_MS = 260;

const EMPTY_DRILL: DrillState = {};

export function CommandDeckView({
  siteName,
  domain,
  commanderName,
  commanderRole,
  commanderAvatarUrl,
  orbitGroups,
  drillGroups = {},
  enableModuleOpen = true,
}: CommandDeckViewProps) {
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userHovered, setUserHovered] = useState(false);
  const [mode, setMode] = useState<CommandDeckMode>("galaxy");
  const [drill, setDrill] = useState<DrillState>(EMPTY_DRILL);
  const [selectedOrbitItemId, setSelectedOrbitItemId] = useState<string | null>(
    null,
  );
  const [openingNodeId, setOpeningNodeId] = useState<string | null>(null);
  const [openingItemLabel, setOpeningItemLabel] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersistedDeckState(domain);
    if (saved) {
      setSelectedId(saved.selectedId);
      setDrill(saved.drill ?? EMPTY_DRILL);
      setMode(saved.mode ?? "galaxy");
      setSelectedOrbitItemId(saved.selectedOrbitItemId ?? null);
    }
    setHydrated(true);
  }, [domain]);

  const persistState = useCallback(() => {
    savePersistedDeckState(domain, {
      selectedId,
      drill,
      mode,
      selectedOrbitItemId,
    });
  }, [domain, selectedId, drill, mode, selectedOrbitItemId]);

  const selected: CommandDeckNode | null = useMemo(
    () => COMMAND_DECK_NODES.find((n) => n.id === selectedId) ?? null,
    [selectedId],
  );

  const activeOrbitItems = useMemo(
    () =>
      selectedId
        ? resolveActiveOrbitItems(selectedId, drill, orbitGroups, drillGroups)
        : [],
    [selectedId, drill, orbitGroups, drillGroups],
  );

  const selectedOrbitItem: OrbitItem | null = useMemo(() => {
    if (!selectedOrbitItemId) return null;
    return activeOrbitItems.find((i) => i.id === selectedOrbitItemId) ?? null;
  }, [selectedOrbitItemId, activeOrbitItems]);

  const activeOrbitSet: OrbitSet | undefined = useMemo(() => {
    if (!selectedId) return undefined;
    return buildOrbitSet(
      resolveActiveOrbitItems(selectedId, drill, orbitGroups, drillGroups),
    );
  }, [selectedId, drill, orbitGroups, drillGroups]);

  const drillBreadcrumb = useMemo(() => {
    if (!selectedId) return [];
    return getDrillBreadcrumb(selectedId, drill, drillGroups);
  }, [selectedId, drill, drillGroups]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDrill(EMPTY_DRILL);
    setSelectedOrbitItemId(null);
    setMode("focus");
  };

  const handleUserClick = () => {
    if (drill.subcategoryKey) {
      setDrill((d) => ({ categoryKey: d.categoryKey }));
      setSelectedOrbitItemId(null);
      setMode("focus");
      return;
    }
    if (drill.categoryKey) {
      setDrill(EMPTY_DRILL);
      setSelectedOrbitItemId(null);
      setMode("focus");
      return;
    }
    setSelectedId(null);
    setSelectedOrbitItemId(null);
    setMode("galaxy");
  };

  const handleBackgroundClick = () => {
    setMode("galaxy");
  };

  const navigateWithFade = useCallback(
    (href: string, label: string, nodeId?: string) => {
      if (!enableModuleOpen) return;
      persistState();
      if (nodeId) setOpeningNodeId(nodeId);
      setOpeningItemLabel(label);
      window.setTimeout(() => {
        router.push(href);
      }, NAV_FADE_DURATION_MS);
    },
    [enableModuleOpen, persistState, router],
  );

  const openModule = useCallback(
    (nodeId: string) => {
      const href = buildModuleHref(domain, nodeId);
      if (!href) return;
      const node = COMMAND_DECK_NODES.find((n) => n.id === nodeId);
      navigateWithFade(href, node?.label ?? nodeId, nodeId);
    },
    [domain, navigateWithFade],
  );

  const handleOrbitItemClick = useCallback(
    (item: OrbitItem) => {
      if (!selectedId) return;
      const kind = item.kind ?? "entity";

      if (kind === "category" && item.childrenKey) {
        setDrill({ categoryKey: item.childrenKey });
        setSelectedOrbitItemId(item.id);
        setMode("focus");
        return;
      }

      if (kind === "subcategory" && item.childrenKey) {
        setDrill((d) => ({
          categoryKey: d.categoryKey,
          subcategoryKey: item.childrenKey,
        }));
        setSelectedOrbitItemId(item.id);
        setMode("focus");
        return;
      }

      setSelectedOrbitItemId(item.id);
      setMode("focus");
    },
    [selectedId],
  );

  const handleOrbitItemDoubleClick = useCallback(
    (item: OrbitItem) => {
      if (!enableModuleOpen || !selectedId) return;
      const href = resolveOrbitOpenHref(domain, selectedId, item, {
        userRole: commanderRole,
      });
      if (!href) return;
      navigateWithFade(href, item.label);
    },
    [domain, selectedId, commanderRole, enableModuleOpen, navigateWithFade],
  );

  const handleDrillBreadcrumbClick = (
    level: "category" | "subcategory",
    key: string,
  ) => {
    if (level === "category") {
      setDrill({ categoryKey: key });
      setSelectedOrbitItemId(null);
    } else {
      setDrill((d) => ({ categoryKey: d.categoryKey, subcategoryKey: key }));
      setSelectedOrbitItemId(null);
    }
    setMode("focus");
  };

  const openSelectedOrbitItem = () => {
    if (!selectedOrbitItem || !selectedId) return;
    const href = resolveOrbitOpenHref(domain, selectedId, selectedOrbitItem, {
      userRole: commanderRole,
    });
    if (!href) return;
    navigateWithFade(href, selectedOrbitItem.label);
  };

  const openingNode = openingNodeId
    ? COMMAND_DECK_NODES.find((n) => n.id === openingNodeId) ?? null
    : null;

  const openingColor = openingNode?.color ?? selected?.color ?? "#7dd3fc";
  const openingLabel = openingItemLabel ?? openingNode?.label ?? "…";

  if (!hydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-page-shadow text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span className="animate-pulse">Loading command deck…</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-page-shadow text-foreground">
      <div className="absolute inset-0">
        <CommandDeckScene
          selectedId={selectedId}
          hoveredId={hoveredId}
          mode={mode}
          userName={commanderName}
          userSubtitle={commanderRole || undefined}
          userAvatarUrl={commanderAvatarUrl}
          userHovered={userHovered}
          orbitGroups={orbitGroups}
          drillGroups={drillGroups}
          drill={drill}
          selectedOrbitItemId={selectedOrbitItemId}
          onHover={setHoveredId}
          onSelect={handleSelect}
          onNodeDoubleClick={openModule}
          onOrbitItemClick={handleOrbitItemClick}
          onOrbitItemDoubleClick={handleOrbitItemDoubleClick}
          onUserHover={setUserHovered}
          onUserClick={handleUserClick}
          onBackgroundClick={handleBackgroundClick}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,8,0.72) 100%)",
        }}
      />

      <TopBar
        siteName={siteName}
        domain={domain}
        mode={mode}
        onModeChange={(next) => setMode(next)}
        hasSelection={selected !== null}
        hasOrbitFocus={selectedOrbitItemId !== null}
      />

      <WelcomePanel
        commanderName={commanderName}
        commanderRole={commanderRole}
        commanderAvatarUrl={commanderAvatarUrl}
        siteName={siteName}
        onRecenter={handleUserClick}
      />

      <AnimatePresence mode="wait">
        {selected && (
          <SelectedModulePanel
            key={selected.id}
            node={selected}
            mode={mode}
            domain={domain}
            orbit={activeOrbitSet}
            drillBreadcrumb={drillBreadcrumb}
            hasDrill={moduleHasDrill(selected.id)}
            drill={drill}
            selectedOrbitItem={selectedOrbitItem}
            enableModuleOpen={enableModuleOpen}
            commanderRole={commanderRole}
            isOpening={openingNodeId === selected.id}
            onOpen={() => openModule(selected.id)}
            onOpenOrbitItem={openSelectedOrbitItem}
            onEnterFocus={() => setMode("focus")}
            onBackToGalaxy={() => setMode("galaxy")}
            onDrillBreadcrumbClick={handleDrillBreadcrumbClick}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(openingNode || openingItemLabel) && (
          <motion.div
            key="nav-fade"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: NAV_FADE_DURATION_MS / 1000 }}
            className="pointer-events-none absolute inset-0 z-30"
            style={{
              background: `radial-gradient(circle at center, ${openingColor}22, rgba(2,4,8,0.94) 70%)`,
            }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div
                className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em]"
                style={{
                  color: openingColor,
                  borderColor: `${openingColor}88`,
                  background: "rgba(6, 10, 20, 0.75)",
                  boxShadow: `0 0 24px ${openingColor}55`,
                  backdropFilter: "blur(6px)",
                }}
              >
                Opening · {openingLabel}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopBar({
  siteName,
  domain,
  mode,
  onModeChange,
  hasSelection,
  hasOrbitFocus,
}: {
  siteName: string;
  domain: string;
  mode: CommandDeckMode;
  onModeChange: (next: CommandDeckMode) => void;
  hasSelection: boolean;
  hasOrbitFocus: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 md:p-5">
      <div className="pointer-events-auto flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-[0.45em] text-muted-foreground">
          {siteName} · Command Deck
        </span>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-[22px]">
          Santini Command Deck
        </h1>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Immersive home · V2.4
        </span>
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-3">
        <ViewSwitch domain={domain} active="galaxy" />

        <div
          className="hidden items-center gap-2 rounded-full border border-border/60 bg-page-shadow/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground backdrop-blur md:flex"
          title="Click to focus, double-click to open"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_#7dd3fc]" />
          {mode === "focus"
            ? hasOrbitFocus
              ? "Item focus · double-click to open"
              : "Focus mode · double-click to open"
            : hasSelection
              ? "Home · selection kept"
              : "Home"}
        </div>

        <ModeToggle mode={mode} onModeChange={onModeChange} />
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: CommandDeckMode;
  onModeChange: (next: CommandDeckMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border/70 bg-surface-strong/80 p-1 shadow-lg shadow-black/40 backdrop-blur">
      <ModeToggleButton
        active={mode === "galaxy"}
        onClick={() => onModeChange("galaxy")}
        label="Galaxy"
      />
      <ModeToggleButton
        active={mode === "focus"}
        onClick={() => onModeChange("focus")}
        label="Focus"
      />
    </div>
  );
}

function ModeToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors",
        active ? "text-background" : "text-foreground/80 hover:text-foreground",
      ].join(" ")}
    >
      {active && (
        <motion.span
          layoutId="mode-pill"
          className="absolute inset-0 rounded-full bg-foreground"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function WelcomePanel({
  commanderName,
  commanderRole,
  commanderAvatarUrl,
  siteName,
  onRecenter,
}: {
  commanderName: string;
  commanderRole?: string | null;
  commanderAvatarUrl?: string | null;
  siteName: string;
  onRecenter: () => void;
}) {
  const firstName =
    (commanderName || "").trim().split(/\s+/)[0] || "Commander";
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-5 left-4 z-20 w-[260px] rounded-xl border border-border/60 bg-page-shadow/75 p-3 shadow-xl shadow-black/50 backdrop-blur-md md:left-5"
    >
      <div className="flex items-center gap-2.5">
        <MiniAvatar name={commanderName} avatarUrl={commanderAvatarUrl} />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-foreground">
            Welcome, {firstName}
          </div>
          <div className="truncate text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            {commanderRole || "Operator"} · {siteName}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Click a node to focus, double-click to open. Orbit badges drill into
        categories — click to focus, double-click to open the record.
      </p>

      <button
        type="button"
        onClick={onRecenter}
        className="mt-3 w-full rounded-md border border-border/80 bg-surface-strong/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-foreground transition hover:border-sky-500/70 hover:text-sky-200"
      >
        Re-center home
      </button>
    </motion.div>
  );
}

function MiniAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageFailed;

  const size = 32;
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "1px solid rgba(125, 211, 252, 0.55)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 30% 25%, rgba(125, 211, 252, 0.35), rgba(6, 10, 20, 0.9) 70%)",
    position: "relative",
    flexShrink: 0,
  };

  return (
    <div style={common}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl as string}
          alt={name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <span className="text-[11px] font-semibold text-sky-200">
          {getInitials(name)}
        </span>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background bg-emerald-400" />
    </div>
  );
}

function SelectedModulePanel({
  node,
  mode,
  domain,
  orbit,
  drillBreadcrumb,
  hasDrill,
  drill,
  selectedOrbitItem,
  enableModuleOpen,
  commanderRole,
  isOpening,
  onOpen,
  onOpenOrbitItem,
  onEnterFocus,
  onBackToGalaxy,
  onDrillBreadcrumbClick,
}: {
  node: CommandDeckNode;
  mode: CommandDeckMode;
  domain: string;
  orbit: OrbitSet | undefined;
  drillBreadcrumb: Array<{
    key: string;
    label: string;
    level: "category" | "subcategory";
  }>;
  hasDrill: boolean;
  drill: DrillState;
  selectedOrbitItem: OrbitItem | null;
  enableModuleOpen: boolean;
  commanderRole?: string | null;
  isOpening: boolean;
  onOpen: () => void;
  onOpenOrbitItem: () => void;
  onEnterFocus: () => void;
  onBackToGalaxy: () => void;
  onDrillBreadcrumbClick: (
    level: "category" | "subcategory",
    key: string,
  ) => void;
}) {
  const moduleHref = buildModuleHref(domain, node.id);

  const drillLevelLabel = !hasDrill
    ? "Entità"
    : !drill.categoryKey
      ? "Categorie"
      : !drill.subcategoryKey
        ? "Sottocategorie"
        : "Articoli";

  const orbitItemHref = selectedOrbitItem
    ? resolveOrbitOpenHref(domain, node.id, selectedOrbitItem, {
        userRole: commanderRole,
      })
    : null;

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="pointer-events-auto absolute right-4 top-20 z-20 w-[320px] overflow-hidden rounded-2xl border border-border/70 bg-page-shadow/85 shadow-2xl shadow-black/50 backdrop-blur-md md:right-6 md:top-24 md:w-[340px]"
    >
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${node.color}00, ${node.color}, ${node.color}00)`,
        }}
      />

      <div className="p-4 md:p-5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: node.color,
              boxShadow: `0 0 14px ${node.color}`,
            }}
          />
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            Selected module
          </span>
        </div>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          {node.label}
        </h2>
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          {node.subtitle}
        </div>

        {hasDrill && drillBreadcrumb.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {drillBreadcrumb.map((crumb, idx) => (
              <span key={crumb.key} className="flex items-center gap-1">
                {idx > 0 && (
                  <span className="text-[9px] text-muted-foreground">/</span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onDrillBreadcrumbClick(crumb.level, crumb.key)
                  }
                  className="rounded border border-border/60 bg-surface-strong/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/90 transition hover:border-sky-500/50 hover:text-sky-200"
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>
        )}

        {orbit && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-border/70 bg-surface-strong/50 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: node.color,
                  boxShadow: `0 0 8px ${node.color}99`,
                }}
              />
              <span className="text-[11px] text-foreground/80">
                {orbit.truncated
                  ? `${orbit.items.length} di ${orbit.total}`
                  : orbit.total}{" "}
                in orbita · {drillLevelLabel}
              </span>
            </div>
            <span
              className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.24em]"
              style={{
                borderColor: `${node.color}66`,
                color: node.color,
                background: "rgba(6, 10, 20, 0.6)",
              }}
            >
              live
            </span>
          </div>
        )}

        {selectedOrbitItem && (
          <div
            className="mt-3 rounded-lg border border-border/70 bg-surface-strong/50 p-3"
            style={{ boxShadow: `inset 0 0 0 1px ${node.color}12` }}
          >
            <div className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
              Focused item
            </div>
            <div className="mt-1 text-[13px] font-semibold text-foreground">
              {selectedOrbitItem.label}
            </div>
            {selectedOrbitItem.category && (
              <div
                className="mt-0.5 text-[10px] uppercase tracking-[0.2em]"
                style={{ color: `${node.color}cc` }}
              >
                {selectedOrbitItem.category}
              </div>
            )}
            {selectedOrbitItem.status && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Stato · {selectedOrbitItem.status}
              </div>
            )}
            {selectedOrbitItem.dueDate && (
              <div className="mt-0.5 text-[10px] text-amber-200/90">
                Scadenza ·{" "}
                {new Date(selectedOrbitItem.dueDate).toLocaleDateString("it-IT")}
              </div>
            )}
            <button
              type="button"
              onClick={onOpenOrbitItem}
              disabled={!enableModuleOpen || !orbitItemHref}
              className="mt-3 w-full rounded-md border border-border/80 bg-page-shadow/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground transition hover:border-sky-500/70 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              style={
                enableModuleOpen && orbitItemHref
                  ? { borderColor: `${node.color}66` }
                  : undefined
              }
            >
              Open record
            </button>
          </div>
        )}

        <p className="mt-3 text-[12px] leading-relaxed text-foreground/80">
          {node.description}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <PrimaryCta
            node={node}
            href={moduleHref}
            enabled={enableModuleOpen && moduleHref !== null}
            isOpening={isOpening}
            onClick={onOpen}
          />
          <button
            type="button"
            onClick={mode === "focus" ? onBackToGalaxy : onEnterFocus}
            className="rounded-lg border border-border/80 bg-surface-strong/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground transition hover:border-border hover:text-foreground"
          >
            {mode === "focus" ? "Back to home" : "Focus this module"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PrimaryCta({
  node,
  href,
  enabled,
  isOpening,
  onClick,
}: {
  node: CommandDeckNode;
  href: string | null;
  enabled: boolean;
  isOpening: boolean;
  onClick: () => void;
}) {
  const base =
    "group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.22em] transition";
  const enabledClass =
    "border bg-page-shadow text-foreground hover:bg-surface-strong";
  const disabledClass =
    "cursor-not-allowed border border-dashed border-border/80 bg-surface-strong/40 text-muted-foreground";

  const style = enabled
    ? {
        borderColor: `${node.color}88`,
        boxShadow: `0 0 18px ${node.color}22`,
      }
    : undefined;

  const content = (
    <>
      <span className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: node.color,
            boxShadow: enabled ? `0 0 8px ${node.color}` : undefined,
          }}
        />
        {isOpening ? "Opening…" : "Open module"}
      </span>
      <span
        className="rounded-full border px-1.5 py-0.5 text-[9px] tracking-[0.3em]"
        style={{
          borderColor: enabled ? `${node.color}88` : "rgba(148,163,184,0.35)",
          color: enabled ? node.color : "rgba(148,163,184,0.75)",
        }}
      >
        {enabled ? node.label : "unlinked"}
      </span>
    </>
  );

  if (enabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isOpening}
        aria-label={`Open ${node.label} module`}
        title={href ?? undefined}
        className={`${base} ${enabledClass}`}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <button type="button" disabled className={`${base} ${disabledClass}`}>
      {content}
    </button>
  );
}

function getInitials(name: string): string {
  if (!name) return "CM";
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "CM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default CommandDeckView;
