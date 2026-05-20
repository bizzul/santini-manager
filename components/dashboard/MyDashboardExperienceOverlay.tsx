"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Infinity, Sparkles, X } from "lucide-react";
import {
  getMyDashboardWizardStep,
  type MyDashboardAsset,
} from "@/lib/my-dashboard-experience";
import { cn } from "@/lib/utils";

type SelectionMap = Record<string, string>;
type QuadOption = {
  id: string;
  label: string;
  value: string;
  helper: string;
  asset?: MyDashboardAsset;
};

const DAILY_PROGRESS_STORAGE_KEY = "santini-my-dashboard-daily-progress";
const BASE_SESSION_SECONDS = 120;
const DAILY_BONUS_SECONDS = 45;
const DAILY_REQUIRED_SELECTIONS = 2;

type DailyProgress = {
  bonusSeconds: number;
  awardedDates: string[];
};

interface MyDashboardExperienceOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AssetPreview({ asset }: { asset: MyDashboardAsset }) {
  if (asset.kind === "color") {
    return (
      <div
        className="h-16 rounded-2xl border border-white/15 shadow-inner"
        style={{ background: asset.preview }}
      />
    );
  }

  if (asset.kind === "font") {
    return (
      <div className="flex h-16 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-3xl font-black tracking-tight">
        {asset.preview}
      </div>
    );
  }

  if (asset.kind === "model3d") {
    return (
      <div className="relative flex h-16 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-linear-to-br from-white/15 to-white/5">
        <div
          className={cn(
            "shadow-3xl h-10 w-10 bg-linear-to-br from-cyan-300 via-blue-500 to-violet-500",
            asset.preview === "orb" && "rounded-full",
            asset.preview === "cube" && "rotate-45 rounded-lg",
            asset.preview === "tower" && "h-12 w-8 rounded-md"
          )}
        />
        <div className="absolute inset-x-5 bottom-3 h-2 rounded-full bg-cyan-400/20 blur-md" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-16 rounded-2xl border border-white/15 bg-linear-to-br shadow-inner",
        asset.preview
      )}
    />
  );
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadDailyProgress(): DailyProgress {
  if (typeof window === "undefined") {
    return { bonusSeconds: 0, awardedDates: [] };
  }

  try {
    const raw = window.localStorage.getItem(DAILY_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return { bonusSeconds: 0, awardedDates: [] };
    }

    const parsed = JSON.parse(raw) as Partial<DailyProgress>;
    return {
      bonusSeconds: Math.max(0, Number(parsed.bonusSeconds) || 0),
      awardedDates: Array.isArray(parsed.awardedDates) ? parsed.awardedDates : [],
    };
  } catch {
    return { bonusSeconds: 0, awardedDates: [] };
  }
}

function saveDailyProgress(progress: DailyProgress) {
  try {
    window.localStorage.setItem(
      DAILY_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress)
    );
  } catch {
    // Local progress is a UX enhancement; storage failures should not block setup.
  }
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MyDashboardExperienceOverlay({
  open,
  onOpenChange,
}: MyDashboardExperienceOverlayProps) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<SelectionMap>({});
  const [timerStarted, setTimerStarted] = useState(false);
  const [bonusSeconds, setBonusSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(BASE_SESSION_SECONDS);
  const [awardedToday, setAwardedToday] = useState(false);
  const [dailyRewardedNow, setDailyRewardedNow] = useState(false);
  const [openedQuadrantId, setOpenedQuadrantId] = useState<string | null>(null);
  const step = useMemo(() => getMyDashboardWizardStep(stepIndex), [stepIndex]);
  const selectedValue = selections[step.id];
  const selectedCount = Object.keys(selections).length;
  const timerExpired = timerStarted && remainingSeconds <= 0;
  const totalSessionSeconds = BASE_SESSION_SECONDS + bonusSeconds;
  const dailyProgressCount = Math.min(selectedCount, DAILY_REQUIRED_SELECTIONS);
  const quadOptions = useMemo<QuadOption[]>(() => {
    if (step.type === "question") {
      return step.options.slice(0, 4).map((option, index) => ({
        id: `${step.id}-${index}`,
        label: option,
        value: option,
        helper: "Apri questo quadrato e conferma la direzione.",
      }));
    }

    const options: QuadOption[] = step.options.slice(0, 4).map((asset, index) => ({
      id: `${step.id}-${asset.id}-${index}`,
      label: asset.title,
      value: asset.value,
      helper: asset.description,
      asset,
    }));

    while (options.length < 4) {
      const index = options.length;
      options.push({
        id: `${step.id}-surprise-${index}`,
        label: "Sorprendimi",
        value: `surprise-${step.assetKind}-${index}`,
        helper: "Lascia scegliere al sistema una variante coerente.",
      });
    }

    return options;
  }, [step]);
  const openedQuadrant = quadOptions.find(
    (option) => option.id === openedQuadrantId
  );

  useEffect(() => {
    const progress = loadDailyProgress();
    const today = getTodayKey();

    setBonusSeconds(progress.bonusSeconds);
    setRemainingSeconds(BASE_SESSION_SECONDS + progress.bonusSeconds);
    setAwardedToday(progress.awardedDates.includes(today));
  }, []);

  useEffect(() => {
    setOpenedQuadrantId(null);
  }, [step.id]);

  useEffect(() => {
    if (!timerStarted || remainingSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [remainingSeconds, timerStarted]);

  const awardDailyBonusIfReady = (nextSelectedCount: number) => {
    if (awardedToday || nextSelectedCount < DAILY_REQUIRED_SELECTIONS) {
      return;
    }

    const today = getTodayKey();
    const progress = loadDailyProgress();

    if (progress.awardedDates.includes(today)) {
      setAwardedToday(true);
      return;
    }

    const nextProgress = {
      bonusSeconds: progress.bonusSeconds + DAILY_BONUS_SECONDS,
      awardedDates: [...progress.awardedDates, today],
    };

    saveDailyProgress(nextProgress);
    setBonusSeconds(nextProgress.bonusSeconds);
    setRemainingSeconds((current) => current + DAILY_BONUS_SECONDS);
    setAwardedToday(true);
    setDailyRewardedNow(true);
  };

  const handleSelect = (value: string) => {
    if (timerExpired) {
      return;
    }

    const isNewSelection = !selectedValue;
    const nextSelectedCount = selectedCount + (isNewSelection ? 1 : 0);

    setSelections((current) => ({
      ...current,
      [step.id]: value,
    }));

    if (step.type === "question" && !timerStarted) {
      setTimerStarted(true);
    }

    awardDailyBonusIfReady(nextSelectedCount);

    window.setTimeout(() => {
      setStepIndex((current) => current + 1);
    }, 650);
  };

  const handleNext = () => {
    if (timerExpired) {
      return;
    }

    setStepIndex((current) => current + 1);
  };

  const handleClose = () => {
    onOpenChange(false);
    window.setTimeout(() => {
      setStarted(false);
      setStepIndex(0);
      setSelections({});
      setTimerStarted(false);
      setRemainingSeconds(BASE_SESSION_SECONDS + bonusSeconds);
      setDailyRewardedNow(false);
    }, 250);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-slate-950/70 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(59,130,246,0.30),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(16,185,129,0.20),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.50),rgba(2,6,23,0.95))]"
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6 }}
          />

          <button
            type="button"
            onClick={handleClose}
            className="absolute right-5 top-5 z-10 rounded-full border border-white/15 bg-white/10 p-2 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
            aria-label="Chiudi esperienza My Dashboard"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute left-10 top-10 h-32 w-32 rounded-full border border-cyan-300/30" />
            <div className="absolute bottom-16 right-16 h-44 w-44 rounded-[2rem] border border-emerald-300/20 rotate-12" />
            <div className="absolute left-1/2 top-20 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_40px_18px_rgba(34,211,238,0.35)]" />
          </div>

          {!started ? (
            <motion.div
              className="relative z-10 flex max-w-2xl flex-col items-center text-center text-white"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 18 }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Schermata bloccata, modalità configurazione
              </div>

              <button
                type="button"
                onClick={() => setStarted(true)}
                className="group relative h-40 w-80 rounded-[2rem] border border-cyan-200/30 bg-linear-to-br from-cyan-300 via-blue-600 to-violet-700 text-white shadow-[0_35px_80px_rgba(37,99,235,0.45)] transition duration-300 hover:-translate-y-2 hover:rotate-1 hover:shadow-[0_45px_100px_rgba(34,211,238,0.45)] focus:outline-none focus:ring-4 focus:ring-cyan-300/40 motion-reduce:transition-none"
              >
                <span className="absolute inset-x-6 top-5 h-10 rounded-full bg-white/25 blur-xl" />
                <span className="absolute inset-0 rounded-[2rem] bg-[linear-gradient(120deg,rgba(255,255,255,0.32),transparent_42%,rgba(255,255,255,0.18))]" />
                <span className="relative flex h-full flex-col items-center justify-center">
                  <span className="text-sm uppercase tracking-[0.35em] text-cyan-100">
                    Start
                  </span>
                  <span className="mt-2 text-4xl font-black tracking-tight">
                    My 1° Dashboard
                  </span>
                </span>
                <span className="absolute -bottom-5 left-8 right-8 h-8 rounded-full bg-blue-900/60 blur-xl" />
              </button>

              <p className="mt-8 max-w-xl text-sm leading-6 text-slate-200">
                Rispondi e scegli asset in sequenza: domanda, file, domanda,
                file. Il timer parte dopo la prima risposta: ogni giorno, dopo
                le scelte del giorno, guadagni 45 secondi in più.
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="relative z-10 grid w-full max-w-5xl gap-6 rounded-[2rem] border border-white/15 bg-slate-950/70 p-6 text-white shadow-2xl backdrop-blur-xl lg:grid-cols-[0.75fr_1.25fr]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            >
              <aside className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <div className="flex items-center gap-2 text-sm text-cyan-100">
                  <Infinity className="h-4 w-4" />
                  Configurazione infinita
                </div>
                <h2 className="mt-4 text-3xl font-black leading-tight">
                  My 1° Dashboard
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Step {stepIndex + 1}. Ogni risposta apre subito la scheda
                  successiva: domanda, elemento, domanda, elemento.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div className="text-2xl font-bold">{selectedCount}</div>
                    <div className="text-slate-400">scelte fatte</div>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-4">
                    <div
                      className={cn(
                        "text-2xl font-bold",
                        timerExpired && "text-rose-300"
                      )}
                    >
                      {timerStarted ? formatTime(remainingSeconds) : formatTime(totalSessionSeconds)}
                    </div>
                    <div className="text-slate-400">
                      {timerStarted ? "tempo rimasto" : "tempo disponibile"}
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-white/8 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-300">Scelte del giorno</span>
                    <span className="font-semibold text-cyan-100">
                      {dailyProgressCount}/{DAILY_REQUIRED_SELECTIONS}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-300 transition-all"
                      style={{
                        width: `${(dailyProgressCount / DAILY_REQUIRED_SELECTIONS) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    {awardedToday
                      ? dailyRewardedNow
                        ? "Bonus di oggi ottenuto: +45 secondi."
                        : "Bonus di oggi già ottenuto."
                      : "Completa domanda + elemento per sbloccare +45 secondi."}
                  </p>
                </div>
              </aside>

              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-cyan-200">
                      {step.type === "question"
                        ? "Domanda"
                        : `File: ${step.assetKind}`}
                    </div>
                    <h3 className="mt-2 text-2xl font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{step.helper}</p>
                  </div>
                  {timerExpired ? (
                    <div className="rounded-full border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100">
                      Tempo scaduto
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!selectedValue}
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {selectedValue ? "Continua" : "Seleziona"}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {timerExpired && (
                  <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                    Il tempo di oggi è finito. Torna domani: se completi le
                    scelte giornaliere guadagni altri 45 secondi.
                  </div>
                )}

                <div className="flex justify-center">
                  <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/55 p-3 shadow-[0_28px_90px_rgba(8,47,73,0.32)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent)]" />
                    <div className="relative grid h-full grid-cols-2 grid-rows-2 gap-3">
                      {quadOptions.map((option, index) => {
                        const selected = selectedValue === option.value;
                        const opened = openedQuadrantId === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => !timerExpired && setOpenedQuadrantId(option.id)}
                            disabled={timerExpired}
                            className={cn(
                              "group relative overflow-hidden rounded-[1.35rem] border p-4 text-left transition duration-300 disabled:cursor-not-allowed disabled:opacity-45",
                              "bg-linear-to-br from-white/12 via-white/[0.06] to-white/[0.03]",
                              "hover:-translate-y-1 hover:border-cyan-200/50 hover:bg-cyan-300/10 motion-reduce:transition-none",
                              selected || opened
                                ? "border-cyan-300/70 shadow-[0_0_32px_rgba(34,211,238,0.22)]"
                                : "border-white/12"
                            )}
                          >
                            <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                              <div className="absolute inset-x-5 top-4 h-10 rounded-full bg-cyan-200/20 blur-2xl" />
                            </div>
                            <span className="relative flex h-full flex-col justify-between">
                              <span>
                                <span className="text-xs uppercase tracking-[0.24em] text-cyan-100/60">
                                  Quadrato {index + 1}
                                </span>
                                <span className="mt-3 block text-lg font-bold text-white">
                                  {option.label}
                                </span>
                              </span>
                              <span className="flex items-center justify-between gap-3 text-xs text-slate-300">
                                <span>Apri quadrato</span>
                                {selected && (
                                  <Check className="h-4 w-4 shrink-0 text-cyan-200" />
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/45 bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.95),rgba(103,232,249,0.8)_22%,rgba(37,99,235,0.8)_52%,rgba(15,23,42,0.95)_100%)] shadow-[0_0_28px_rgba(34,211,238,0.5),inset_-12px_-14px_22px_rgba(15,23,42,0.55)]" />

                    <AnimatePresence>
                      {openedQuadrant && (
                        <motion.div
                          key={openedQuadrant.id}
                          initial={{ opacity: 0, scale: 0.72, y: 18 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.72, y: 18 }}
                          transition={{ type: "spring", stiffness: 260, damping: 24 }}
                          className="absolute inset-8 z-30 rounded-[1.75rem] border border-cyan-200/50 bg-slate-950/92 p-5 text-white shadow-[0_35px_90px_rgba(8,47,73,0.65)] backdrop-blur-xl"
                        >
                          <div className="flex h-full flex-col justify-between gap-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.28em] text-cyan-200">
                                Quadrato aperto
                              </div>
                              <h4 className="mt-3 text-2xl font-black">
                                {openedQuadrant.label}
                              </h4>
                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                {openedQuadrant.helper}
                              </p>
                            </div>

                            {openedQuadrant.asset && (
                              <AssetPreview asset={openedQuadrant.asset} />
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setOpenedQuadrantId(null)}
                                className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                              >
                                Indietro
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelect(openedQuadrant.value)}
                                disabled={timerExpired}
                                className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Scegli
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
