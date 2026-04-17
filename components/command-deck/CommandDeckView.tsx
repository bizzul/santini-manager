"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { COMMAND_DECK_NODES, type CommandDeckNode } from "./nodes";
import { buildModuleHref } from "./routes";
import type { CommandDeckMode } from "./CommandDeckScene";
import type { OrbitGroups, OrbitSet } from "./orbit-items";

// Load the R3F scene client-side only. Three.js touches `window` and WebGL,
// so disabling SSR avoids hydration warnings and server-side errors.
const CommandDeckScene = dynamic(
  () => import("./CommandDeckScene").then((m) => m.CommandDeckScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#05080f] text-xs uppercase tracking-[0.4em] text-slate-400">
        <span className="animate-pulse">Initializing command deck…</span>
      </div>
    ),
  },
);

interface CommandDeckViewProps {
  siteName: string;
  /** Current site subdomain; used to build module routes via `routes.ts`. */
  domain: string;
  commanderName: string;
  commanderRole?: string | null;
  commanderAvatarUrl?: string | null;
  /**
   * Per-node orbit data. Keys are node ids (e.g. "clienti", "fornitori", …).
   * Each value includes the cap-limited items, the pre-cap total and a flag
   * signalling whether we fell back to demo items for that category.
   */
  orbitGroups: OrbitGroups;
  /**
   * Toggle module navigation. When `false`, the "Open module" CTA becomes a
   * disabled preview (useful for offline demos / screenshots).
   */
  enableModuleOpen?: boolean;
}

/** Duration of the fade-out overlay before the browser navigates away. */
const NAV_FADE_DURATION_MS = 260;

export function CommandDeckView({
  siteName,
  domain,
  commanderName,
  commanderRole,
  commanderAvatarUrl,
  orbitGroups,
  enableModuleOpen = true,
}: CommandDeckViewProps) {
  const router = useRouter();

  // No default selection: V2.1+ home is centered on the user, not on Overview.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userHovered, setUserHovered] = useState(false);
  const [mode, setMode] = useState<CommandDeckMode>("galaxy");
  const [openingNodeId, setOpeningNodeId] = useState<string | null>(null);

  const selected: CommandDeckNode | null = useMemo(
    () => COMMAND_DECK_NODES.find((n) => n.id === selectedId) ?? null,
    [selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMode("focus");
  };

  const handleUserClick = () => {
    setSelectedId(null);
    setMode("galaxy");
  };

  const handleBackgroundClick = () => {
    setMode("galaxy");
  };

  /**
   * Navigate to the real site route for a node, with a short fade-out to
   * avoid a jarring jump. Safe to call from either the CTA or a double-click.
   */
  const openModule = useCallback(
    (nodeId: string) => {
      if (!enableModuleOpen) return;
      const href = buildModuleHref(domain, nodeId);
      if (!href) return;

      setOpeningNodeId(nodeId);
      // Give the overlay time to fade in; Next.js prefetch makes the
      // subsequent router.push near-instant.
      window.setTimeout(() => {
        router.push(href);
      }, NAV_FADE_DURATION_MS);
    },
    [domain, enableModuleOpen, router],
  );

  const openingNode = openingNodeId
    ? COMMAND_DECK_NODES.find((n) => n.id === openingNodeId) ?? null
    : null;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#04070d] text-slate-100">
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
          onHover={setHoveredId}
          onSelect={handleSelect}
          onNodeDoubleClick={openModule}
          onUserHover={setUserHovered}
          onUserClick={handleUserClick}
          onBackgroundClick={handleBackgroundClick}
        />
      </div>

      {/* Soft radial vignette to improve text legibility over the scene */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,8,0.72) 100%)",
        }}
      />

      <TopBar
        siteName={siteName}
        mode={mode}
        onModeChange={(next) => setMode(next)}
        hasSelection={selected !== null}
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
            orbit={orbitGroups[selected.id]}
            enableModuleOpen={enableModuleOpen}
            isOpening={openingNodeId === selected.id}
            onOpen={() => openModule(selected.id)}
            onEnterFocus={() => setMode("focus")}
            onBackToGalaxy={() => setMode("galaxy")}
          />
        )}
      </AnimatePresence>

      {/* Navigation fade-out overlay — plays right before router.push */}
      <AnimatePresence>
        {openingNode && (
          <motion.div
            key="nav-fade"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: NAV_FADE_DURATION_MS / 1000 }}
            className="pointer-events-none absolute inset-0 z-30"
            style={{
              background: `radial-gradient(circle at center, ${openingNode.color}22, rgba(2,4,8,0.94) 70%)`,
            }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div
                className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em]"
                style={{
                  color: openingNode.color,
                  borderColor: `${openingNode.color}88`,
                  background: "rgba(6, 10, 20, 0.75)",
                  boxShadow: `0 0 24px ${openingNode.color}55`,
                  backdropFilter: "blur(6px)",
                }}
              >
                Opening · {openingNode.label}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function TopBar({
  siteName,
  mode,
  onModeChange,
  hasSelection,
}: {
  siteName: string;
  mode: CommandDeckMode;
  onModeChange: (next: CommandDeckMode) => void;
  hasSelection: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-6 p-4 md:p-5">
      <div className="pointer-events-auto flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-[0.45em] text-slate-400">
          {siteName} · Command Deck
        </span>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 md:text-[22px]">
          Santini Command Deck
        </h1>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Immersive home · V2.3
        </span>
      </div>

      <div className="pointer-events-auto flex items-center gap-3">
        <div
          className="hidden items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-slate-400 backdrop-blur md:flex"
          title="Double-click a node to open directly, or use the Open button"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_#7dd3fc]" />
          {mode === "focus"
            ? "Focus mode · double-click to open"
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
    <div className="flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-900/80 p-1 shadow-lg shadow-black/40 backdrop-blur">
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
        active ? "text-slate-950" : "text-slate-300 hover:text-slate-100",
      ].join(" ")}
    >
      {active && (
        <motion.span
          layoutId="mode-pill"
          className="absolute inset-0 rounded-full bg-slate-100"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Left welcome panel
// ---------------------------------------------------------------------------

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
      className="pointer-events-auto absolute bottom-5 left-4 z-20 w-[240px] rounded-xl border border-slate-700/60 bg-slate-950/75 p-3 shadow-xl shadow-black/50 backdrop-blur-md md:left-5"
    >
      <div className="flex items-center gap-2.5">
        <MiniAvatar name={commanderName} avatarUrl={commanderAvatarUrl} />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-slate-100">
            Welcome, {firstName}
          </div>
          <div className="truncate text-[9px] uppercase tracking-[0.25em] text-slate-500">
            {commanderRole || "Operator"} · {siteName}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
        Click a node to focus, double-click to open the module directly.
      </p>

      <button
        type="button"
        onClick={onRecenter}
        className="mt-3 w-full rounded-md border border-slate-700/80 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-200 transition hover:border-sky-500/70 hover:text-sky-200"
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
      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-slate-950 bg-emerald-400" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right selected-module panel
// ---------------------------------------------------------------------------

function SelectedModulePanel({
  node,
  mode,
  domain,
  orbit,
  enableModuleOpen,
  isOpening,
  onOpen,
  onEnterFocus,
  onBackToGalaxy,
}: {
  node: CommandDeckNode;
  mode: CommandDeckMode;
  domain: string;
  orbit: OrbitSet | undefined;
  enableModuleOpen: boolean;
  isOpening: boolean;
  onOpen: () => void;
  onEnterFocus: () => void;
  onBackToGalaxy: () => void;
}) {
  const moduleHref = buildModuleHref(domain, node.id);

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="pointer-events-auto absolute right-4 top-20 z-20 w-[320px] overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/85 shadow-2xl shadow-black/50 backdrop-blur-md md:right-6 md:top-24 md:w-[340px]"
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
          <span className="text-[10px] uppercase tracking-[0.32em] text-slate-400">
            Selected module
          </span>
        </div>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-50">
          {node.label}
        </h2>
        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
          {node.subtitle}
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-slate-300">
          {node.description}
        </p>

        {orbit && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-900/50 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: node.color,
                  boxShadow: `0 0 8px ${node.color}99`,
                }}
              />
              <span className="text-[11px] text-slate-300">
                {orbit.truncated
                  ? `${orbit.items.length} di ${orbit.total}`
                  : orbit.total}{" "}
                in orbita
              </span>
            </div>
            <span
              className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.24em] uppercase"
              style={
                orbit.isDemo
                  ? {
                      borderColor: "rgba(253, 230, 138, 0.45)",
                      color: "#fde68a",
                      background: "rgba(253, 230, 138, 0.08)",
                    }
                  : {
                      borderColor: `${node.color}66`,
                      color: node.color,
                      background: "rgba(6, 10, 20, 0.6)",
                    }
              }
            >
              {orbit.isDemo ? "demo" : "live"}
            </span>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Live signals
            </span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-slate-600">
              demo
            </span>
          </div>
          <div className="space-y-1.5">
            {node.signals.map((signal) => (
              <SignalRow
                key={signal.label}
                label={signal.label}
                value={signal.value}
                tone={signal.tone}
                accent={node.color}
              />
            ))}
          </div>
        </div>

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
            className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            {mode === "focus" ? "Back to home" : "Focus this module"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Primary call-to-action that opens the real module.
 *
 * Implementation detail: we use a plain <button> (not next/link) because we
 * want to play a tiny fade-out before router.push; the click handler is in
 * charge of the actual navigation through `openModule()`.
 *
 * The `href` is still surfaced in `aria-label` / title so screen readers and
 * hover tooltips expose the destination.
 */
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
    "border bg-slate-950 text-slate-50 hover:bg-slate-900";
  const disabledClass =
    "cursor-not-allowed border border-dashed border-slate-700/80 bg-slate-900/40 text-slate-400";

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

function SignalRow({
  label,
  value,
  tone = "neutral",
  accent,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral" | "warning";
  accent: string;
}) {
  const dot =
    tone === "positive"
      ? "bg-emerald-400"
      : tone === "negative"
        ? "bg-rose-400"
        : tone === "warning"
          ? "bg-amber-300"
          : "bg-slate-400";
  return (
    <div
      className="flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-900/50 px-2.5 py-1.5"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}0d` }}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[11px] text-slate-300">{label}</span>
      </div>
      <span className="text-[13px] font-semibold text-slate-100">{value}</span>
    </div>
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
