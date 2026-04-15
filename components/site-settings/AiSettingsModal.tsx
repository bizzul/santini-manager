"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    Loader2,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getVoiceCommandScreenContexts, VOICE_COMMAND_INTENT_LABELS } from "@/lib/voice-command-config";
import { VOICE_INTENT_REQUIREMENTS } from "@/lib/site-settings-guides";

interface AiSettingsModalProps {
    siteId: string;
    subdomain: string;
    trigger: React.ReactNode;
}

interface AiSettings {
    aiProvider: string;
    aiModel: string;
    speechProvider: string;
    hasAiApiKey: boolean;
    hasWhisperApiKey: boolean;
    aiApiKeyMasked: string | null;
    whisperApiKeyMasked: string | null;
}

const AI_PROVIDERS = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic (Claude)" },
];

const AI_MODELS: Record<string, Array<{ value: string; label: string }>> = {
    openai: [
        { value: "gpt-4o-mini", label: "GPT-4o Mini (economico)" },
        { value: "gpt-4o", label: "GPT-4o (preciso)" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
    anthropic: [
        { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (consigliato)" },
        { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (veloce)" },
        { value: "claude-3-opus-latest", label: "Claude 3 Opus (potente)" },
    ],
};

const SPEECH_PROVIDERS = [
    { value: "web-speech", label: "Web Speech API (gratuito)" },
    { value: "whisper", label: "OpenAI Whisper (preciso)" },
];

export default function AiSettingsModal({
    siteId,
    subdomain,
    trigger,
}: AiSettingsModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<AiSettings | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showWhisperKey, setShowWhisperKey] = useState(false);

    // Form state
    const [aiProvider, setAiProvider] = useState("openai");
    const [aiModel, setAiModel] = useState("gpt-4o-mini");
    const [speechProvider, setSpeechProvider] = useState("web-speech");
    const [aiApiKey, setAiApiKey] = useState("");
    const [whisperApiKey, setWhisperApiKey] = useState("");

    // Load settings when modal opens
    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open, subdomain]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/sites/${subdomain}/ai-settings`);
            const data = await response.json();

            if (response.ok) {
                setSettings(data);
                setAiProvider(data.aiProvider || "openai");
                setAiModel(data.aiModel || "gpt-4o-mini");
                setSpeechProvider(data.speechProvider || "web-speech");
            }
        } catch (error) {
            console.error("Error loading AI settings:", error);
            toast.error("Errore nel caricamento delle impostazioni");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const body: Record<string, string> = {
                aiProvider,
                aiModel,
                speechProvider,
            };

            // Only send API keys if they were changed
            if (aiApiKey) {
                body.aiApiKey = aiApiKey;
            }
            if (whisperApiKey) {
                body.whisperApiKey = whisperApiKey;
            }

            const response = await fetch(`/api/sites/${subdomain}/ai-settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                toast.success("Impostazioni salvate con successo");
                // Clear the input fields after saving
                setAiApiKey("");
                setWhisperApiKey("");
                // Reload settings to show updated masked keys
                await loadSettings();
            } else {
                const error = await response.json();
                throw new Error(error.error || "Errore nel salvataggio");
            }
        } catch (error) {
            console.error("Error saving AI settings:", error);
            toast.error(
                error instanceof Error ? error.message : "Errore nel salvataggio"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteKey = async (keyType: "ai" | "whisper") => {
        try {
            const response = await fetch(
                `/api/sites/${subdomain}/ai-settings?keyType=${keyType}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                toast.success(
                    `API key ${keyType === "ai" ? "AI" : "Whisper"} eliminata`
                );
                await loadSettings();
            } else {
                throw new Error("Errore nell'eliminazione");
            }
        } catch (error) {
            toast.error("Errore nell'eliminazione della chiave");
        }
    };

    // Update model when provider changes
    const handleProviderChange = (provider: string) => {
        setAiProvider(provider);
        // Set default model for the provider
        const models = AI_MODELS[provider];
        if (models && models.length > 0) {
            setAiModel(models[0].value);
        }
    };

    const availableModels = AI_MODELS[aiProvider] || [];
    const voiceContexts = useMemo(() => getVoiceCommandScreenContexts(), []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI, API & voice</DialogTitle>
                    <DialogDescription>
                        Configura provider AI, API key e regole base per usare il microfono nelle varie aree.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* AI Provider */}
                        <div className="space-y-2">
                            <Label>Provider AI</Label>
                            <Select value={aiProvider} onValueChange={handleProviderChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AI_PROVIDERS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* AI Model */}
                        <div className="space-y-2">
                            <Label>Modello AI</Label>
                            <Select value={aiModel} onValueChange={setAiModel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableModels.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* AI API Key */}
                        <div className="space-y-2">
                            <Label>API Key {aiProvider === "openai" ? "OpenAI" : "Anthropic"}</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showApiKey ? "text" : "password"}
                                        value={aiApiKey}
                                        onChange={(e) => setAiApiKey(e.target.value)}
                                        placeholder={
                                            settings?.hasAiApiKey
                                                ? `Configurata (${settings.aiApiKeyMasked})`
                                                : "Inserisci API key"
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                {settings?.hasAiApiKey && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteKey("ai")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {settings?.hasAiApiKey && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    API key configurata
                                </p>
                            )}
                        </div>

                        {/* Speech Provider */}
                        <div className="space-y-2">
                            <Label>Provider Speech-to-Text</Label>
                            <Select value={speechProvider} onValueChange={setSpeechProvider}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SPEECH_PROVIDERS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {speechProvider === "web-speech" && (
                                <p className="text-xs text-muted-foreground">
                                    Gratuito. Supportato su Chrome, Edge e Safari.
                                </p>
                            )}
                        </div>

                        {/* Whisper API Key (only if Whisper selected) */}
                        {speechProvider === "whisper" && (
                            <div className="space-y-2">
                                <Label>API Key Whisper (opzionale)</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={showWhisperKey ? "text" : "password"}
                                            value={whisperApiKey}
                                            onChange={(e) => setWhisperApiKey(e.target.value)}
                                            placeholder={
                                                settings?.hasWhisperApiKey
                                                    ? `Configurata (${settings.whisperApiKeyMasked})`
                                                    : "Usa API key AI se non specificata"
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                            onClick={() => setShowWhisperKey(!showWhisperKey)}
                                        >
                                            {showWhisperKey ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    {settings?.hasWhisperApiKey && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleDeleteKey("whisper")}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Warning if no API key */}
                        {!settings?.hasAiApiKey && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Per utilizzare le funzionalità AI (come l&apos;input vocale),
                                    è necessario configurare una API key.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                            <div>
                                <h3 className="text-sm font-semibold">Pannello guida comandi vocali</h3>
                                <p className="text-xs text-muted-foreground">
                                    Ogni area con microfono mostra le informazioni minime che conviene pronunciare.
                                </p>
                            </div>
                            <Accordion type="single" collapsible className="w-full">
                                {voiceContexts.map((context) => (
                                    <AccordionItem key={context.key} value={context.key}>
                                        <AccordionTrigger className="text-left">
                                            <div>
                                                <div className="font-medium">{context.label}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {context.description}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-3">
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Azioni supportate
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {context.allowedIntents.map((intent) => (
                                                        <span
                                                            key={intent}
                                                            className="rounded-full border border-border px-2.5 py-1 text-xs"
                                                        >
                                                            {VOICE_COMMAND_INTENT_LABELS[intent]}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Dati obbligatori nel vocale
                                                </p>
                                                <ul className="mt-2 space-y-1 text-sm text-foreground/85">
                                                    {context.allowedIntents.flatMap((intent) =>
                                                        (VOICE_INTENT_REQUIREMENTS[intent] || []).map((item) => (
                                                            <li key={`${context.key}-${intent}-${item}`}>
                                                                - {VOICE_COMMAND_INTENT_LABELS[intent]}: {item}
                                                            </li>
                                                        ))
                                                    )}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Esempi
                                                </p>
                                                <ul className="mt-2 space-y-1 text-sm text-foreground/85">
                                                    {context.examples.map((example) => (
                                                        <li key={`${context.key}-${example}`}>- {example}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Annulla
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            "Salva"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
