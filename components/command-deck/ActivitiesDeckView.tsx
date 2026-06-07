"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { COMMAND_DECK_NODES } from "./nodes";
import {
  loadPersistedDeckState,
  savePersistedDeckState,
} from "./routes";
import type { CommandDeckMode } from "./CommandDeckScene";
import type { ActivityCountsByModule, ActivitiesPayload } from "./activities-data";
import type { OrbitGroups, OrbitItem } from "./orbit-items";
import { ViewSwitch } from "./ViewSwitch";

const CommandDeckScene = dynamic(
  () => import("./CommandDeckScene").then((m) => m.CommandDeckScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-page-shadow text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span className="animate-pulse">Loading activities…</span>
      </div>
    ),
  },
);

interface ActivitiesDeckViewProps {
  siteName: string;
  domain: string;
  commanderName: string;
  commanderRole?: string | null;
  commanderAvatarUrl?: string | null;
  orbitGroups: OrbitGroups;
  countsByModule: ActivityCountsByModule;
  totalActivities: number;
  enableModuleOpen?: boolean;
}

const NAV_FADE_DURATION_MS = 260;

export function ActivitiesDeckView({
  siteName,
  domain,
  commanderName,
  commanderRole,
  commanderAvatarUrl,
  orbitGroups,
  countsByModule,
  totalActivities,
  enableModuleOpen = true,
}: ActivitiesDeckViewProps) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userHovered, setUserHovered] = useState(false);
  const [mode, setMode] = useState<CommandDeckMode>("galaxy");
  const [selectedOrbitItemId, setSelectedOrbitItemId] = useState<string | null>(
    null,
  );
  const [openingLabel, setOpeningLabel] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersistedDeckState(domain);
    if (saved?.selectedOrbitItemId) {
      setSelectedOrbitItemId(saved.selectedOrbitItemId);
      setMode(saved.mode ?? "galaxy");
    }
    setHydrated(true);
  }, [domain]);

  const activities = orbitGroups.activities?.items ?? [];

  const selectedActivity: OrbitItem | null = useMemo(
    () => activities.find((a) => a.id === selectedOrbitItemId) ?? null,
    [activities, selectedOrbitItemId],
  );

  const persistState = useCallback(() => {
    savePersistedDeckState(domain, {
      selectedId: null,
      drill: {},
      mode,
      selectedOrbitItemId,
    });
  }, [domain, mode, selectedOrbitItemId]);

  const navigateWithFade = useCallback(
    (href: string, label: string) => {
      if (!enableModuleOpen) return;
      persistState();
      setOpeningLabel(label);
      window.setTimeout(() => {
        router.push(href);
      }, NAV_FADE_DURATION_MS);
    },
    [enableModuleOpen, persistState, router],
  );

  const handleOrbitItemClick = (item: OrbitItem) => {
    setSelectedOrbitItemId(item.id);
    setMode("focus");
  };

  const handleOrbitItemDoubleClick = (item: OrbitItem) => {
    if (!item.href) return;
    navigateWithFade(item.href, item.label);
  };

  const handleUserClick = () => {
    setSelectedOrbitItemId(null);
    setMode("galaxy");
  };

  const openSelectedActivity = () => {
    if (!selectedActivity?.href) return;
    navigateWithFade(selectedActivity.href, selectedActivity.label);
  };

  const openingColor = selectedActivity?.color ?? "#7dd3fc";

  const moduleCounts = COMMAND_DECK_NODES.map((node) => ({
    id: node.id,
    label: node.label,
    color: node.color,
    count: countsByModule[node.id] ?? 0,
  })).filter((m) => m.count > 0);

  if (!hydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-page-shadow text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span className="animate-pulse">Loading activities…</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-page-shadow text-foreground">
      <div className="absolute inset-0">
        <CommandDeckScene
          selectedId={null}
          hoveredId={hoveredId}
          mode={mode}
          userName={commanderName}
          userSubtitle={commanderRole || undefined}
          userAvatarUrl={commanderAvatarUrl}
          userHovered={userHovered}
          orbitGroups={orbitGroups}
          selectedOrbitItemId={selectedOrbitItemId}
          sceneVariant="activities"
          onHover={setHoveredId}
          onSelect={() => {}}
          onOrbitItemClick={handleOrbitItemClick}
          onOrbitItemDoubleClick={handleOrbitItemDoubleClick}
          onUserHover={setUserHovered}
          onUserClick={handleUserClick}
          onBackgroundClick={() => setMode("galaxy")}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,8,0.72) 100%)",
        }}
      />

      <ActivitiesTopBar
        siteName={siteName}
        domain={domain}
        mode={mode}
        totalActivities={totalActivities}
        onModeChange={setMode}
        hasActivityFocus={selectedOrbitItemId !== null}
      />

      <ActivitiesWelcomePanel
        commanderName={commanderName}
        commanderRole={commanderRole}
        commanderAvatarUrl={commanderAvatarUrl}
        siteName={siteName}
        totalActivities={totalActivities}
        moduleCounts={moduleCounts}
        onRecenter={handleUserClick}
      />

      <AnimatePresence mode="wait">
        {selectedActivity && (
          <SelectedActivityPanel
            key={selectedActivity.id}
            activity={selectedActivity}
            mode={mode}
            enableModuleOpen={enableModuleOpen && Boolean(selectedActivity.href)}
            onOpen={openSelectedActivity}
            onBackToGalaxy={() => setMode("galaxy")}
            onEnterFocus={() => setMode("focus")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openingLabel && (
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

function ActivitiesTopBar({
  siteName,
  domain,
  mode,
  totalActivities,
  onModeChange,
  hasActivityFocus,
}: {
  siteName: string;
  domain: string;
  mode: CommandDeckMode;
  totalActivities: number;
  onModeChange: (next: CommandDeckMode) => void;
  hasActivityFocus: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 md:p-5">
      <div className="pointer-events-auto flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-[0.45em] text-muted-foreground">
          {siteName} · Attività aperte
        </span>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-[22px]">
          Open Activities
        </h1>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          {totalActivities} attività in orbita
        </span>
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-3">
        <ViewSwitch domain={domain} active="activities" />

        <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-page-shadow/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground backdrop-blur md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
          {mode === "focus"
            ? hasActivityFocus
              ? "Activity focus · double-click to open"
              : "Focus mode"
            : "Galaxy view"}
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
      {(["galaxy", "focus"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onModeChange(m)}
          className={[
            "relative rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors",
            mode === m
              ? "text-background"
              : "text-foreground/80 hover:text-foreground",
          ].join(" ")}
        >
          {mode === m && (
            <motion.span
              layoutId="activities-mode-pill"
              className="absolute inset-0 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            />
          )}
          <span className="relative z-10 capitalize">{m}</span>
        </button>
      ))}
    </div>
  );
}

function ActivitiesWelcomePanel({
  commanderName,
  commanderRole,
  commanderAvatarUrl,
  siteName,
  totalActivities,
  moduleCounts,
  onRecenter,
}: {
  commanderName: string;
  commanderRole?: string | null;
  commanderAvatarUrl?: string | null;
  siteName: string;
  totalActivities: number;
  moduleCounts: Array<{
    id: string;
    label: string;
    color: string;
    count: number;
  }>;
  onRecenter: () => void;
}) {
  const firstName =
    (commanderName || "").trim().split(/\s+/)[0] || "Commander";

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-5 left-4 z-20 w-[280px] rounded-xl border border-border/60 bg-page-shadow/75 p-3 shadow-xl shadow-black/50 backdrop-blur-md md:left-5"
    >
      <div className="flex items-center gap-2.5">
        <MiniAvatar name={commanderName} avatarUrl={commanderAvatarUrl} />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-foreground">
            {firstName} · {totalActivities} attività
          </div>
          <div className="truncate text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            {commanderRole || "Operator"} · {siteName}
          </div>
        </div>
      </div>

      {moduleCounts.length > 0 && (
        <div className="mt-3 space-y-1">
          {moduleCounts.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-md border border-border/60 bg-surface-strong/40 px-2 py-1"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: m.color,
                    boxShadow: `0 0 6px ${m.color}88`,
                  }}
                />
                <span className="text-[10px] text-foreground/85">{m.label}</span>
              </div>
              <span
                className="text-[11px] font-semibold"
                style={{ color: m.color }}
              >
                {m.count}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Click an activity to focus, double-click to open the related module or
        record.
      </p>

      <button
        type="button"
        onClick={onRecenter}
        className="mt-3 w-full rounded-md border border-border/80 bg-surface-strong/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-foreground transition hover:border-sky-500/70 hover:text-sky-200"
      >
        Re-center
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

  return (
    <div
      style={{
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
        flexShrink: 0,
        position: "relative",
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl as string}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span className="text-[11px] font-semibold text-sky-200">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background bg-emerald-400" />
    </div>
  );
}

function SelectedActivityPanel({
  activity,
  mode,
  enableModuleOpen,
  onOpen,
  onBackToGalaxy,
  onEnterFocus,
}: {
  activity: OrbitItem;
  mode: CommandDeckMode;
  enableModuleOpen: boolean;
  onOpen: () => void;
  onBackToGalaxy: () => void;
  onEnterFocus: () => void;
}) {
  const accent = activity.color ?? "#7dd3fc";

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="pointer-events-auto absolute right-4 top-20 z-20 w-[320px] overflow-hidden rounded-2xl border border-border/70 bg-page-shadow/85 shadow-2xl shadow-black/50 backdrop-blur-md md:right-6 md:top-24 md:w-[340px]"
    >
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)`,
        }}
      />

      <div className="p-4 md:p-5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 14px ${accent}` }}
          />
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            Selected activity
          </span>
        </div>

        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
          {activity.label}
        </h2>

        {activity.category && (
          <div
            className="mt-1 text-[11px] uppercase tracking-[0.28em]"
            style={{ color: `${accent}cc` }}
          >
            {activity.category}
          </div>
        )}

        {activity.status && (
          <div className="mt-2 text-[11px] text-muted-foreground">
            Stato · {activity.status}
          </div>
        )}

        {activity.dueDate && (
          <div className="mt-1 text-[11px] text-amber-200/90">
            Scadenza ·{" "}
            {new Date(activity.dueDate).toLocaleDateString("it-IT")}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onOpen}
            disabled={!enableModuleOpen}
            className="rounded-lg border bg-page-shadow px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground transition hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: `${accent}88`,
              boxShadow: `0 0 18px ${accent}22`,
            }}
          >
            Open activity
          </button>
          <button
            type="button"
            onClick={mode === "focus" ? onBackToGalaxy : onEnterFocus}
            className="rounded-lg border border-border/80 bg-surface-strong/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground transition hover:border-border"
          >
            {mode === "focus" ? "Back to galaxy" : "Focus activity"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default ActivitiesDeckView;
