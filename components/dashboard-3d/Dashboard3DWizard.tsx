"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Loader2, Plus, Save, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dashboard3DViewer } from "@/components/dashboard-3d/Dashboard3DViewer";
import {
  DASHBOARD_3D_ASSET_BUCKET,
  createDefaultDashboard3DSceneConfig,
  getDashboard3DAssetPath,
} from "@/lib/dashboard-3d";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import type {
  Dashboard3DAnswers,
  Dashboard3DAnimationType,
  Dashboard3DAssetType,
  Dashboard3DScene,
  Dashboard3DSceneAsset,
  Dashboard3DSceneConfig,
} from "@/types/supabase";

type Dashboard3DWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  siteId: string;
  initialScene: Dashboard3DScene | null;
  onSaved: (scene: Dashboard3DScene) => void;
};

type Option<T extends string> = {
  value: T;
  label: string;
  description: string;
};

const GOAL_OPTIONS: Array<Option<Dashboard3DAnswers["goal"]>> = [
  { value: "showroom", label: "Showroom", description: "Presentazione immersiva per clienti e visite." },
  { value: "production", label: "Produzione", description: "Vista operativa con focus su flussi e reparti." },
  { value: "sales", label: "Vendite", description: "Dashboard scenografica per pipeline e priorita commerciali." },
  { value: "client_project", label: "Progetto cliente", description: "Ambiente 3D dedicato a una commessa." },
  { value: "internal_demo", label: "Demo interna", description: "Spazio sperimentale per validare idee." },
];

const STYLE_OPTIONS: Array<Option<Dashboard3DAnswers["style"]>> = [
  { value: "technical", label: "Tecnico", description: "Linee nette, profondita e materiali funzionali." },
  { value: "premium", label: "Premium", description: "Contrasti eleganti e oggetti in primo piano." },
  { value: "showroom", label: "Showroom", description: "Sfondo ambientato e focus sull'esposizione." },
  { value: "minimal", label: "Minimal", description: "Pochi elementi, pulizia e leggibilita." },
  { value: "industrial", label: "Industriale", description: "Toni scuri, metalli e presenza materica." },
];

const ANIMATION_OPTIONS: Dashboard3DAnimationType[] = ["none", "float", "rotate", "pulse"];

function createAssetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getInitialAnswers(scene: Dashboard3DScene | null): Dashboard3DAnswers {
  return scene?.answers ?? {
    goal: "showroom",
    style: "premium",
    primaryColor: "#38bdf8",
    backgroundColor: "#020617",
    accentColor: "#f59e0b",
    intensity: 70,
  };
}

function getInitialConfig(
  scene: Dashboard3DScene | null,
  answers: Dashboard3DAnswers,
): Dashboard3DSceneConfig {
  return scene?.scene_config ?? createDefaultDashboard3DSceneConfig(answers);
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl border p-4 text-left transition hover:border-primary/70 hover:bg-primary/5",
            value === option.value
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background text-muted-foreground",
          )}
        >
          <span className="block text-sm font-semibold text-foreground">
            {option.label}
          </span>
          <span className="mt-1 block text-xs leading-5">{option.description}</span>
        </button>
      ))}
    </div>
  );
}

export function Dashboard3DWizard({
  open,
  onOpenChange,
  domain,
  siteId,
  initialScene,
  onSaved,
}: Dashboard3DWizardProps) {
  const initialAnswers = useMemo(() => getInitialAnswers(initialScene), [initialScene]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Dashboard3DAnswers>(initialAnswers);
  const [sceneConfig, setSceneConfig] = useState<Dashboard3DSceneConfig>(() =>
    getInitialConfig(initialScene, initialAnswers),
  );
  const [sceneName, setSceneName] = useState(initialScene?.name ?? "Prima dashboard 3D");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = ((step + 1) / 5) * 100;
  const hasBackground = sceneConfig.assets.some((asset) => asset.type === "background_image");
  const modelCount = sceneConfig.assets.filter((asset) => asset.type === "model_3d").length;

  function updateAnswers(next: Partial<Dashboard3DAnswers>) {
    setAnswers((current) => {
      const merged = { ...current, ...next };
      setSceneConfig((config) => ({
        ...config,
        canvas: {
          ...config.canvas,
          backgroundColor: merged.backgroundColor,
        },
        assets: config.assets.map((asset) =>
          asset.id === "starter-cube" ? { ...asset, color: merged.primaryColor } : asset,
        ),
      }));
      return merged;
    });
  }

  function updateAsset(assetId: string, updates: Partial<Dashboard3DSceneAsset>) {
    setSceneConfig((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.id === assetId ? { ...asset, ...updates } : asset,
      ),
    }));
  }

  function addPrimitive() {
    setSceneConfig((current) => ({
      ...current,
      assets: [
        ...current.assets,
        {
          id: createAssetId(),
          type: "primitive",
          name: "Nuovo elemento 3D",
          primitive: "sphere",
          position: { x: 0.8, y: 0, z: 0.2 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.45, y: 0.45, z: 0.45 },
          color: answers.accentColor,
          opacity: 0.95,
          animation: "float",
        },
      ],
    }));
  }

  function removeAsset(assetId: string) {
    setSceneConfig((current) => ({
      ...current,
      assets: current.assets.filter((asset) => asset.id !== assetId),
    }));
  }

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>, type: Dashboard3DAssetType) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const storagePath = getDashboard3DAssetPath(siteId, file.name);
      const { error: uploadError } = await supabase.storage
        .from(DASHBOARD_3D_ASSET_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(DASHBOARD_3D_ASSET_BUCKET).getPublicUrl(storagePath);

      const nextAsset: Dashboard3DSceneAsset = {
        id: createAssetId(),
        type,
        name: file.name,
        url: publicUrl,
        storagePath,
        position: type === "background_image" ? { x: 0, y: 0, z: -1.4 } : { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: type === "background_image" ? { x: 1, y: 1, z: 1 } : { x: 0.7, y: 0.7, z: 0.7 },
        color: answers.primaryColor,
        opacity: 1,
        animation: type === "model_3d" ? "float" : "none",
      };

      setSceneConfig((current) => ({
        ...current,
        assets: type === "background_image"
          ? [
              ...current.assets.filter((asset) => asset.type !== "background_image"),
              nextAsset,
            ]
          : [...current.assets, nextAsset],
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Errore durante l'upload");
    } finally {
      setUploading(false);
    }
  }

  async function save(status: "draft" | "published") {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/sites/${domain}/dashboard-3d`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sceneName,
          status,
          answers,
          sceneConfig,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Errore durante il salvataggio");
      }

      onSaved(result.scene);
      if (status === "published") {
        onOpenChange(false);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Configuratore dashboard tridimensionale
              </div>
              <DialogTitle>La tua prima Dashboard 3D</DialogTitle>
              <DialogDescription>
                Rispondi a poche domande, carica sfondi e modelli, poi salva una scena 2:1 pronta per evolvere.
              </DialogDescription>
            </div>
            <div className="text-sm text-muted-foreground">Passo {step + 1} di 5</div>
          </div>
          <Progress className="mt-3 h-2" value={progress} />
        </DialogHeader>

        <div className="grid max-h-[calc(92vh-190px)] overflow-y-auto lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5 border-r px-6 py-6">
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dashboard-3d-name">Nome dashboard</Label>
                  <Input
                    id="dashboard-3d-name"
                    value={sceneName}
                    onChange={(event) => setSceneName(event.target.value)}
                    className="mt-2"
                  />
                </div>
                <OptionGrid
                  options={GOAL_OPTIONS}
                  value={answers.goal}
                  onChange={(goal) => updateAnswers({ goal })}
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <OptionGrid
                  options={STYLE_OPTIONS}
                  value={answers.style}
                  onChange={(style) => updateAnswers({ style })}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Primario</Label>
                    <Input
                      type="color"
                      value={answers.primaryColor}
                      onChange={(event) => updateAnswers({ primaryColor: event.target.value })}
                      className="mt-2 h-11"
                    />
                  </div>
                  <div>
                    <Label>Sfondo</Label>
                    <Input
                      type="color"
                      value={answers.backgroundColor}
                      onChange={(event) => updateAnswers({ backgroundColor: event.target.value })}
                      className="mt-2 h-11"
                    />
                  </div>
                  <div>
                    <Label>Accento</Label>
                    <Input
                      type="color"
                      value={answers.accentColor}
                      onChange={(event) => updateAnswers({ accentColor: event.target.value })}
                      className="mt-2 h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label>Intensita visiva: {answers.intensity}%</Label>
                  <Input
                    type="range"
                    min={10}
                    max={100}
                    value={answers.intensity}
                    onChange={(event) => updateAnswers({ intensity: Number(event.target.value) })}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-dashed p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">Immagine di sfondo</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Usa un&apos;immagine larga: verra posizionata sul piano 2:1.
                      </p>
                    </div>
                    {hasBackground && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600">
                        caricata
                      </span>
                    )}
                  </div>
                  <Button asChild variant="outline" className="mt-4 w-full" disabled={uploading}>
                    <label>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Carica sfondo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => uploadAsset(event, "background_image")}
                      />
                    </label>
                  </Button>
                </div>
                <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Il formato e bloccato a <strong>b2 h1</strong>: due quadrati affiancati, aspect ratio 2:1.
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" disabled={uploading}>
                    <label>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Carica GLB/GLTF
                      <input
                        type="file"
                        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                        className="hidden"
                        onChange={(event) => uploadAsset(event, "model_3d")}
                      />
                    </label>
                  </Button>
                  <Button type="button" variant="secondary" onClick={addPrimitive}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi primitiva
                  </Button>
                </div>
                <div className="space-y-3">
                  {sceneConfig.assets
                    .filter((asset) => asset.type !== "background_image")
                    .map((asset) => (
                      <div key={asset.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {asset.type === "model_3d" ? "Modello 3D" : "Primitiva"} · animazione {asset.animation}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAsset(asset.id)}
                          >
                            Rimuovi
                          </Button>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div>
                            <Label>Scala</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={asset.scale.x}
                              onChange={(event) => {
                                const scale = Number(event.target.value);
                                updateAsset(asset.id, { scale: { x: scale, y: scale, z: scale } });
                              }}
                            />
                          </div>
                          <div>
                            <Label>Colore</Label>
                            <Input
                              type="color"
                              value={asset.color ?? answers.primaryColor}
                              onChange={(event) => updateAsset(asset.id, { color: event.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Animazione</Label>
                            <Select
                              value={asset.animation ?? "none"}
                              onValueChange={(value) =>
                                updateAsset(asset.id, { animation: value as Dashboard3DAnimationType })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ANIMATION_OPTIONS.map((animation) => (
                                  <SelectItem key={animation} value={animation}>
                                    {animation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border p-5">
                  <p className="font-medium">Riepilogo</p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Obiettivo</dt>
                      <dd className="font-medium">{answers.goal}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Stile</dt>
                      <dd className="font-medium">{answers.style}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Sfondo</dt>
                      <dd className="font-medium">{hasBackground ? "caricato" : "colore base"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Modelli caricati</dt>
                      <dd className="font-medium">{modelCount}</dd>
                    </div>
                  </dl>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Salva come bozza se vuoi continuare a comporre la scena, oppure pubblica per completare la prima dashboard 3D.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-4 bg-slate-950 px-6 py-6 text-white">
            <div>
              <p className="text-sm font-semibold">Preview 3D</p>
              <p className="mt-1 text-xs text-slate-400">
                Viewer bloccato sul rettangolo 2:1 b2 h1.
              </p>
            </div>
            <Dashboard3DViewer config={sceneConfig} className="border-slate-700" />
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={step === 0 || saving} onClick={() => setStep((current) => current - 1)}>
              Indietro
            </Button>
            <Button type="button" disabled={step === 4 || saving} onClick={() => setStep((current) => current + 1)}>
              Avanti
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => save("draft")}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salva bozza
            </Button>
            <Button type="button" disabled={saving} onClick={() => save("published")}>
              <Sparkles className="mr-2 h-4 w-4" />
              Pubblica
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
