"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, GripVertical, FileCode, Archive } from "lucide-react";

interface CodeTemplatesModalProps {
  siteId: string;
  trigger: React.ReactNode;
}

interface TemplateConfig {
  template: string;
  sequenceType: string;
  paddingDigits: number;
}

interface AutoArchiveConfig {
  enabled: boolean;
  days: number;
}

const TASK_TYPES = [
  { key: "OFFERTA", label: "Offerta", defaultSuffix: "OFF", color: "blue" },
  { key: "LAVORO", label: "Lavoro", defaultSuffix: "", color: "green" },
  { key: "FATTURA", label: "Fattura", defaultSuffix: "FATT", color: "purple" },
];

const AVAILABLE_VARIABLES = [
  { key: "anno_corto", description: "Ultime 2 cifre anno", example: "25" },
  { key: "anno_lungo", description: "Anno completo", example: "2025" },
  { key: "stato", description: "Suffisso stato", example: "OFF" },
  { key: "sequenza", description: "Numero (3 cifre)", example: "001" },
  { key: "sequenza_4", description: "Numero (4 cifre)", example: "0001" },
  { key: "mese", description: "Mese corrente", example: "12" },
  { key: "giorno", description: "Giorno corrente", example: "10" },
];

const DEFAULT_TEMPLATES: Record<string, TemplateConfig> = {
  OFFERTA: {
    template: "{{anno_corto}}-{{stato}}-{{sequenza}}",
    sequenceType: "OFFERTA",
    paddingDigits: 3,
  },
  LAVORO: {
    template: "{{anno_corto}}-{{sequenza}}",
    sequenceType: "LAVORO",
    paddingDigits: 3,
  },
  FATTURA: {
    template: "{{anno_corto}}-{{stato}}-{{sequenza}}",
    sequenceType: "FATTURA",
    paddingDigits: 3,
  },
};

// Componente per variabile draggabile
function DraggableVariable({
  variable,
}: {
  variable: (typeof AVAILABLE_VARIABLES)[0];
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `{{${variable.key}}}`);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-1.5 px-2 py-1.5 bg-white/10 border border-white/20 rounded-md cursor-grab hover:bg-white/20 hover:border-white/30 transition-all group"
      title={`${variable.description} (es: ${variable.example})`}
    >
      <GripVertical className="h-3 w-3 text-white/40 group-hover:text-white/60" />
      <code className="text-xs text-white/80 font-mono">{`{{${variable.key}}}`}</code>
    </div>
  );
}

// Componente per input con drop zone
function TemplateInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedText = e.dataTransfer.getData("text/plain");

    if (inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart || value.length;
      const end = input.selectionEnd || value.length;
      const newValue = value.slice(0, start) + droppedText + value.slice(end);
      onChange(newValue);

      // Posiziona il cursore dopo il testo inserito
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(
          start + droppedText.length,
          start + droppedText.length
        );
      }, 0);
    }
  };

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      placeholder={placeholder}
      className={`font-mono bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 ${
        isDragOver
          ? "border-2 border-dashed border-blue-400 bg-blue-500/10"
          : ""
      }`}
    />
  );
}

export default function CodeTemplatesModal({
  siteId,
  trigger,
}: CodeTemplatesModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] =
    useState<Record<string, TemplateConfig>>(DEFAULT_TEMPLATES);
  const [archiveConfig, setArchiveConfig] = useState<AutoArchiveConfig>({
    enabled: true,
    days: 7,
  });

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, siteId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const templatesRes = await fetch(
        `/api/settings/code-templates?siteId=${siteId}`
      );
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates({ ...DEFAULT_TEMPLATES, ...data });
      }

      const archiveRes = await fetch(
        `/api/settings/auto-archive?siteId=${siteId}`
      );
      if (archiveRes.ok) {
        const data = await archiveRes.json();
        setArchiveConfig(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (
    taskType: string,
    field: keyof TemplateConfig,
    value: string | number
  ) => {
    setTemplates((prev) => ({
      ...prev,
      [taskType]: { ...prev[taskType], [field]: value },
    }));
  };

  const generateExample = (taskType: string): string => {
    const config = templates[taskType];
    if (!config) return "";

    const now = new Date();
    const year = now.getFullYear();
    const suffix =
      TASK_TYPES.find((t) => t.key === taskType)?.defaultSuffix || "";

    let result = config.template;
    result = result.replace(/\{\{anno_corto\}\}/g, String(year).slice(-2));
    result = result.replace(/\{\{anno_lungo\}\}/g, String(year));
    result = result.replace(/\{\{stato\}\}/g, suffix);
    result = result.replace(
      /\{\{sequenza\}\}/g,
      "001".padStart(config.paddingDigits || 3, "0")
    );
    result = result.replace(/\{\{sequenza_4\}\}/g, "0001");
    result = result.replace(
      /\{\{mese\}\}/g,
      String(now.getMonth() + 1).padStart(2, "0")
    );
    result = result.replace(
      /\{\{giorno\}\}/g,
      String(now.getDate()).padStart(2, "0")
    );
    result = result.replace(/--+/g, "-").replace(/^-+|-+$/g, "");

    return result;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templatesRes = await fetch(`/api/settings/code-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, templates }),
      });

      const archiveRes = await fetch(`/api/settings/auto-archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, config: archiveConfig }),
      });

      if (templatesRes.ok && archiveRes.ok) {
        toast.success("Impostazioni salvate con successo");
        setOpen(false);
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Errore nel salvataggio delle impostazioni");
    } finally {
      setSaving(false);
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-500/20 border-blue-400/50 text-blue-200";
      case "green":
        return "bg-green-500/20 border-green-400/50 text-green-200";
      case "purple":
        return "bg-purple-500/20 border-purple-400/50 text-purple-200";
      default:
        return "bg-gray-500/20 border-gray-400/50 text-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Impostazioni Codici e Offerte
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Configura il formato dei codici generati automaticamente e le
            impostazioni di auto-archiviazione.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        ) : (
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger
                value="templates"
                className="data-[state=active]:bg-white/20 text-white"
              >
                <FileCode className="h-4 w-4 mr-2" />
                Template Codici
              </TabsTrigger>
              <TabsTrigger
                value="archive"
                className="data-[state=active]:bg-white/20 text-white"
              >
                <Archive className="h-4 w-4 mr-2" />
                Auto-Archiviazione
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4 mt-4">
              {/* Variabili draggabili */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <GripVertical className="h-4 w-4" />
                    Variabili disponibili
                  </CardTitle>
                  <CardDescription className="text-white/60 text-xs">
                    Trascina le variabili nel campo template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <DraggableVariable key={v.key} variable={v} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Separator className="bg-white/10" />

              {/* Template per ogni tipo */}
              <div className="space-y-4">
                {TASK_TYPES.map(({ key, label, color }) => (
                  <Card
                    key={key}
                    className={`border ${getColorClass(color)} bg-white/5`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                          <Badge
                            className={`${getColorClass(color)} border-none`}
                          >
                            {label}
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50">Cifre:</span>
                          <Select
                            value={String(templates[key]?.paddingDigits || 3)}
                            onValueChange={(value) =>
                              handleTemplateChange(
                                key,
                                "paddingDigits",
                                parseInt(value)
                              )
                            }
                          >
                            <SelectTrigger className="w-24 h-8 bg-white/10 border-white/30 text-white text-xs font-mono">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">01</SelectItem>
                              <SelectItem value="3">001</SelectItem>
                              <SelectItem value="4">0001</SelectItem>
                              <SelectItem value="5">00001</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">
                          Template (trascina le variabili qui)
                        </Label>
                        <TemplateInput
                          value={templates[key]?.template || ""}
                          onChange={(value) =>
                            handleTemplateChange(key, "template", value)
                          }
                          placeholder="es: {{anno_corto}}-{{stato}}-{{sequenza}}"
                        />
                      </div>

                      {/* Anteprima */}
                      <div className="flex items-center gap-2 p-2 rounded bg-white/10">
                        <span className="text-xs text-white/50">
                          Risultato:
                        </span>
                        <code className="text-sm font-mono font-bold text-white">
                          {generateExample(key) || "—"}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="archive" className="mt-4">
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Auto-Archiviazione Offerte
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Le offerte vinte o perse verranno archiviate automaticamente
                    dopo il periodo specificato.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="auto-archive-enabled"
                      checked={archiveConfig.enabled}
                      onCheckedChange={(checked: boolean) =>
                        setArchiveConfig((prev) => ({
                          ...prev,
                          enabled: !!checked,
                        }))
                      }
                      className="border-white/30 data-[state=checked]:bg-white/20"
                    />
                    <Label
                      htmlFor="auto-archive-enabled"
                      className="text-white cursor-pointer"
                    >
                      Abilita auto-archiviazione
                    </Label>
                  </div>

                  {archiveConfig.enabled && (
                    <div className="space-y-3 pl-7">
                      <div className="flex items-center gap-3">
                        <Label className="text-white/80">Archivia dopo</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={archiveConfig.days}
                          onChange={(e) =>
                            setArchiveConfig((prev) => ({
                              ...prev,
                              days: parseInt(e.target.value) || 7,
                            }))
                          }
                          className="w-20 bg-white/10 border-white/30 text-white"
                        />
                        <span className="text-white/60">giorni</span>
                      </div>
                    </div>
                  )}

                  <Separator className="bg-white/10" />

                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h4 className="font-semibold text-white mb-3">
                      Come funziona
                    </h4>
                    <ul className="space-y-2 text-sm text-white/70">
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Offerte "Vinte" → diventano verdi e piccole
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Offerte "Perse" → diventano rosse e piccole
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500" />
                        Dopo {archiveConfig.days} giorni → archiviate
                        automaticamente
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-white/30 text-white hover:bg-white/10"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Impostazioni"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
