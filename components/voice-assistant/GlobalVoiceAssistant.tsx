"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    useParams,
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    Loader2,
    Mic,
    MicOff,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { useSiteId } from "@/hooks/use-site-id";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
    getVoiceCommandIntentLabel,
    getVoiceCommandIntentLabels,
    getVoiceCommandScreenContext,
} from "@/lib/voice-command-config";
import { splitVoiceCommandTranscript } from "@/lib/voice-command-transcript";

type SpeechProvider = "web-speech" | "whisper";

interface SiteAiSettings {
    speechProvider: SpeechProvider;
    hasAiApiKey: boolean;
    hasWhisperApiKey: boolean;
}

interface CommandOperation {
    endpoint: string;
    method: string;
    body: Record<string, unknown>;
}

type CommandIntent =
    | "create_project"
    | "create_offer"
    | "create_client"
    | "create_product"
    | "schedule_task"
    | "log_time"
    | "move_card"
    | "unknown";

interface CommandClarification {
    question: string;
    missingFields?: string[];
    examples?: string[];
}

interface SingleCommandResult {
    status: "ready" | "needs_clarification";
    intent: CommandIntent;
    summary: string;
    message?: string;
    preview?: Record<string, unknown>;
    clarification?: CommandClarification | null;
    operation?: CommandOperation | null;
}

interface PlannedCommand extends SingleCommandResult {
    id: string;
    transcript: string;
}

interface CommandAnalysisResult {
    status: "ready" | "needs_clarification";
    summary: string;
    message?: string;
    commands: PlannedCommand[];
    readyCount: number;
    blockedCount: number;
}

interface CommandExecutionState {
    status: "running" | "success" | "error";
    message?: string;
}

function formatPreviewValue(value: unknown) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    if (typeof value === "number") {
        return new Intl.NumberFormat("it-IT").format(value);
    }

    return String(value);
}

function createExecutionMessage(
    result: SingleCommandResult,
    payload: Record<string, any> | null
) {
    if (result.intent === "create_client") {
        const clientName =
            payload?.data?.businessName ||
            [payload?.data?.individualFirstName, payload?.data?.individualLastName]
                .filter(Boolean)
                .join(" ");
        return clientName
            ? `Cliente ${clientName} creato correttamente.`
            : "Cliente creato correttamente.";
    }

    if (result.intent === "schedule_task") {
        return `Task pianificato per il ${formatPreviewValue(
            result.preview?.deliveryDate
        )}.`;
    }

    if (result.intent === "log_time") {
        return "Ore registrate correttamente.";
    }

    if (result.intent === "move_card") {
        return `Card spostata in ${formatPreviewValue(
            result.preview?.targetColumn
        )}.`;
    }

    const code = payload?.data?.unique_code;
    if (result.intent === "create_offer") {
        return code
            ? `Offerta ${code} creata correttamente.`
            : "Offerta creata correttamente.";
    }

    if (result.intent === "create_project") {
        return code
            ? `Progetto ${code} creato correttamente.`
            : "Progetto creato correttamente.";
    }

    if (result.intent === "create_product") {
        const productName = payload?.data?.name;
        return productName
            ? `Prodotto ${productName} creato correttamente.`
            : "Prodotto creato correttamente.";
    }

    return "Comando eseguito correttamente.";
}

function formatApiErrorMessage(payload: any, fallback: string) {
    const details = Array.isArray(payload?.details)
        ? payload.details
              .map((detail: { message?: string; path?: Array<string | number> }) => {
                  const path = Array.isArray(detail?.path) ? detail.path.join(".") : "";
                  return path ? `${path}: ${detail.message}` : detail?.message;
              })
              .filter(Boolean)
              .join(", ")
        : null;

    return payload?.message || payload?.error || details || fallback;
}

function formatIntentLabel(intent: CommandIntent) {
    return intent === "unknown"
        ? "azione non riconosciuta"
        : getVoiceCommandIntentLabel(intent);
}

function buildClarificationState(commands: PlannedCommand[]) {
    const firstBlockedCommand = commands.find(
        (command) => command.status !== "ready" || !command.operation
    );

    if (!firstBlockedCommand?.clarification) {
        return null;
    }

    return {
        question: firstBlockedCommand.clarification.question,
        missingFields: firstBlockedCommand.clarification.missingFields,
        examples: firstBlockedCommand.clarification.examples,
        commandId: firstBlockedCommand.id,
    };
}

function buildAnalysisResult(commands: PlannedCommand[]): CommandAnalysisResult {
    const readyCount = commands.filter(
        (command) => command.status === "ready" && command.operation
    ).length;
    const blockedCount = commands.length - readyCount;
    const hasMultipleCommands = commands.length > 1;

    if (!hasMultipleCommands && commands[0]) {
        const singleCommand = commands[0];

        return {
            status:
                singleCommand.status === "ready" && singleCommand.operation
                    ? "ready"
                    : "needs_clarification",
            summary: singleCommand.summary,
            message:
                singleCommand.status === "ready" && singleCommand.operation
                    ? "Analisi completata. Controlla il riepilogo e conferma manualmente l'esecuzione."
                    : singleCommand.message,
            commands,
            readyCount,
            blockedCount,
        };
    }

    if (blockedCount > 0) {
        return {
            status: "needs_clarification",
            summary: `Ho analizzato ${commands.length} azioni: ${readyCount} pronte e ${blockedCount} da chiarire.`,
            message:
                "Le azioni non partiranno automaticamente. Controlla i dettagli mancanti, poi rianalizza la registrazione.",
            commands,
            readyCount,
            blockedCount,
        };
    }

    return {
        status: "ready",
        summary: `Ho preparato ${commands.length} azioni dalla stessa registrazione.`,
        message:
            "Le azioni sono tutte pronte, ma verranno eseguite solo dopo la conferma dell'operatore.",
        commands,
        readyCount,
        blockedCount,
    };
}

export function GlobalVoiceAssistant() {
    const params = useParams();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const domain = useMemo(() => {
        const rawDomain = params?.domain;

        if (typeof rawDomain === "string") {
            return rawDomain;
        }

        if (Array.isArray(rawDomain) && rawDomain.length > 0) {
            return rawDomain[0];
        }

        return null;
    }, [params]);
    const isSiteRoute = Boolean(domain && pathname?.startsWith("/sites/"));
    const currentScreen = useMemo(
        () => getVoiceCommandScreenContext(pathname),
        [pathname]
    );
    const currentKanbanId = useMemo(() => {
        const rawValue = searchParams.get("kanbanId");
        if (!rawValue) return null;

        const parsedValue = Number(rawValue);
        return Number.isNaN(parsedValue) ? null : parsedValue;
    }, [searchParams]);
    const { siteId, loading: siteLoading } = useSiteId(domain || undefined);

    const [open, setOpen] = useState(false);
    const [siteSettings, setSiteSettings] = useState<SiteAiSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [commandResult, setCommandResult] = useState<CommandAnalysisResult | null>(
        null
    );
    const [commandExecutionStates, setCommandExecutionStates] = useState<
        Record<string, CommandExecutionState>
    >({});
    const [executionMessage, setExecutionMessage] = useState<string | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [isRunningCommand, setIsRunningCommand] = useState(false);
    const [clarificationState, setClarificationState] = useState<{
        question: string;
        missingFields?: string[];
        examples?: string[];
        commandId?: string;
    } | null>(null);
    const [manualClarificationAnswer, setManualClarificationAnswer] = useState("");
    const [manualTranscript, setManualTranscript] = useState("");
    const [runMode, setRunMode] = useState<"analysis" | "execution" | null>(null);

    const [whisperRecording, setWhisperRecording] = useState(false);
    const [whisperTranscript, setWhisperTranscript] = useState("");
    const [whisperError, setWhisperError] = useState<string | null>(null);
    const [whisperProcessing, setWhisperProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const {
        transcript: webTranscript,
        fullTranscript: webFullTranscript,
        isRecording: webIsRecording,
        isSupported: webIsSupported,
        error: webSpeechError,
        start: webStartRecording,
        stop: webStopRecording,
        clear: webClearTranscript,
    } = useSpeechToText({
        language: "it-IT",
        continuous: true,
        interimResults: true,
    });

    useEffect(() => {
        if (!open || !domain) {
            return;
        }

        let cancelled = false;
        setSettingsLoading(true);

        fetch(`/api/sites/${domain}/ai-settings`)
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;

                setSiteSettings({
                    speechProvider: data.speechProvider || "web-speech",
                    hasAiApiKey: data.hasAiApiKey || false,
                    hasWhisperApiKey: data.hasWhisperApiKey || false,
                });
            })
            .catch(() => {
                if (cancelled) return;

                setSiteSettings({
                    speechProvider: "web-speech",
                    hasAiApiKey: false,
                    hasWhisperApiKey: false,
                });
            })
            .finally(() => {
                if (!cancelled) {
                    setSettingsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, domain]);

    const useWhisper =
        siteSettings?.speechProvider === "whisper" &&
        (siteSettings?.hasWhisperApiKey || siteSettings?.hasAiApiKey);

    const startWhisperRecording = useCallback(async () => {
        if (!siteId) {
            setWhisperError("Site non disponibile per la trascrizione.");
            return;
        }

        if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === "undefined"
        ) {
            setWhisperError(
                "Questo browser non supporta la registrazione audio necessaria per Whisper."
            );
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/mp4",
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                setWhisperProcessing(true);

                try {
                    const audioBlob = new Blob(audioChunksRef.current, {
                        type: mediaRecorder.mimeType,
                    });
                    const formData = new FormData();
                    formData.append("audio", audioBlob, "voice-command.webm");
                    formData.append("siteId", siteId);
                    formData.append("language", "it");

                    const response = await fetch("/api/voice-input/transcribe", {
                        method: "POST",
                        body: formData,
                    });
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            data.error || data.message || "Errore di trascrizione"
                        );
                    }

                    setWhisperTranscript((previous) =>
                        previous
                            ? `${previous} ${data.transcript || ""}`.trim()
                            : data.transcript || ""
                    );
                } catch (error) {
                    setWhisperError(
                        error instanceof Error
                            ? error.message
                            : "Errore durante la trascrizione"
                    );
                } finally {
                    setWhisperProcessing(false);
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setWhisperRecording(true);
            setWhisperError(null);
        } catch (error) {
            setWhisperError(
                error instanceof Error
                    ? error.message
                    : "Permesso microfono negato"
            );
        }
    }, [siteId]);

    const stopWhisperRecording = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
        ) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => {
                track.stop();
            });
        }

        setWhisperRecording(false);
    }, []);

    const clearWhisperTranscript = useCallback(() => {
        setWhisperTranscript("");
        setWhisperError(null);
    }, []);

    const fullTranscript = useWhisper ? whisperTranscript : webFullTranscript;
    const effectiveTranscript = useMemo(() => {
        return [fullTranscript, manualTranscript].filter(Boolean).join(" ").trim();
    }, [fullTranscript, manualTranscript]);
    const liveTranscript = useWhisper ? "" : webTranscript;
    const isRecording = useWhisper ? whisperRecording : webIsRecording;
    const isSupported = useWhisper ? true : webIsSupported;
    const speechError = useWhisper ? whisperError : webSpeechError?.message || null;
    const commandsReadyToExecute =
        commandResult?.commands.filter(
            (command) => command.status === "ready" && command.operation
        ) || [];
    const canExecuteCommands =
        commandsReadyToExecute.length > 0 &&
        commandResult?.blockedCount === 0 &&
        !clarificationState;
    const clarificationCommandIndex =
        clarificationState?.commandId && commandResult
            ? commandResult.commands.findIndex(
                  (command) => command.id === clarificationState.commandId
              )
            : -1;

    const resetAssistant = useCallback(() => {
        setCommandResult(null);
        setCommandExecutionStates({});
        setExecutionMessage(null);
        setExecutionError(null);
        setIsRunningCommand(false);
        setRunMode(null);
        setClarificationState(null);
        setManualClarificationAnswer("");
        setManualTranscript("");
        webClearTranscript();
        clearWhisperTranscript();
    }, [clearWhisperTranscript, webClearTranscript]);

    const stopRecording = useCallback(() => {
        if (useWhisper) {
            stopWhisperRecording();
            return;
        }

        webStopRecording();
    }, [stopWhisperRecording, useWhisper, webStopRecording]);

    const startRecording = useCallback(async () => {
        setExecutionMessage(null);
        setExecutionError(null);
        setCommandExecutionStates({});
        setRunMode(null);
        if (!clarificationState) {
            setCommandResult(null);
        }

        if (useWhisper) {
            await startWhisperRecording();
            return;
        }

        webStartRecording();
    }, [clarificationState, startWhisperRecording, useWhisper, webStartRecording]);

    const appendTypedClarification = useCallback(() => {
        const answer = manualClarificationAnswer.trim();
        if (!answer) {
            return "";
        }

        setManualTranscript((previous) =>
            previous ? `${previous} ${answer}` : answer
        );
        setManualClarificationAnswer("");
        return answer;
    }, [manualClarificationAnswer]);

    const handleRunCommand = useCallback(async () => {
        if (!siteId) {
            toast({
                variant: "destructive",
                title: "Site non disponibile",
                description: "Aspetta il caricamento del contesto del sito e riprova.",
            });
            return;
        }

        const typedClarification = manualClarificationAnswer.trim();
        const transcriptForAnalysis = [effectiveTranscript, typedClarification]
            .filter(Boolean)
            .join(" ")
            .trim();

        if (!transcriptForAnalysis) {
            toast({
                variant: "destructive",
                title: "Nessuna trascrizione",
                description: "Registra prima un comando vocale.",
            });
            return;
        }

        if (typedClarification) {
            appendTypedClarification();
        }

        setIsRunningCommand(true);
        setRunMode("analysis");
        setCommandExecutionStates({});
        setExecutionError(null);
        setExecutionMessage(null);

        try {
            const commandSegments = splitVoiceCommandTranscript(transcriptForAnalysis);

            if (commandSegments.length === 0) {
                throw new Error("Non ho trovato azioni chiare nella trascrizione.");
            }

            const analysisRequests = commandSegments.map(async (segment, index) => {
                const parseResponse = await fetch("/api/voice-input/command", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        transcript: segment,
                        siteId,
                        context: {
                            pathname,
                            currentKanbanId,
                            currentModule: currentScreen.module,
                            currentScreen: currentScreen.key,
                            screenLabel: currentScreen.label,
                            allowedIntents: currentScreen.allowedIntents,
                        },
                    }),
                });
                const parsed = await parseResponse.json().catch(() => null);

                if (!parseResponse.ok) {
                    throw new Error(
                        formatApiErrorMessage(
                            parsed,
                            `Errore durante l'analisi dell'azione ${index + 1}.`
                        )
                    );
                }

                return {
                    id: `command-${index + 1}`,
                    transcript: segment,
                    ...(parsed as SingleCommandResult),
                } satisfies PlannedCommand;
            });

            const settledResults = await Promise.allSettled(analysisRequests);
            const analyzedCommands = settledResults.map((result, index) => {
                if (result.status === "fulfilled") {
                    return result.value;
                }

                return {
                    id: `command-${index + 1}`,
                    transcript: commandSegments[index],
                    status: "needs_clarification",
                    intent: "unknown",
                    summary: `Azione ${index + 1} da chiarire`,
                    message: result.reason instanceof Error
                        ? result.reason.message
                        : "Non sono riuscito a interpretare questa azione.",
                    clarification: {
                        question:
                            "Puoi riformulare questa parte della registrazione in modo piu' preciso?",
                    },
                    operation: null,
                } satisfies PlannedCommand;
            });

            const analysisResult = buildAnalysisResult(analyzedCommands);
            setCommandResult(analysisResult);
            setClarificationState(buildClarificationState(analyzedCommands));
            setManualClarificationAnswer("");

            toast({
                title:
                    analysisResult.status === "ready"
                        ? "Analisi completata"
                        : "Analisi completata con chiarimenti",
                description:
                    analysisResult.message ||
                    "Controlla il riepilogo delle azioni prima di procedere.",
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Errore durante l'analisi del comando vocale";
            setCommandResult(null);
            setCommandExecutionStates({});
            setClarificationState(null);
            setExecutionError(message);

            toast({
                variant: "destructive",
                title: "Errore comando vocale",
                description: message,
            });
        } finally {
            setIsRunningCommand(false);
            setRunMode(null);
        }
    }, [
        appendTypedClarification,
        currentKanbanId,
        currentScreen,
        effectiveTranscript,
        manualClarificationAnswer,
        pathname,
        siteId,
        toast,
    ]);

    const handleExecuteCommands = useCallback(async () => {
        if (!siteId || !commandResult) {
            return;
        }

        const commandsToExecute = commandResult.commands.filter(
            (command) => command.status === "ready" && command.operation
        );

        if (commandsToExecute.length === 0) {
            toast({
                variant: "destructive",
                title: "Nessuna azione eseguibile",
                description:
                    "Prima completa l'analisi e chiarisci eventuali dati mancanti.",
            });
            return;
        }

        setIsRunningCommand(true);
        setRunMode("execution");
        setExecutionMessage(null);
        setExecutionError(null);
        setCommandExecutionStates({});

        let successCount = 0;
        let errorCount = 0;

        try {
            for (const command of commandsToExecute) {
                setCommandExecutionStates((previous) => ({
                    ...previous,
                    [command.id]: {
                        status: "running",
                        message: "Esecuzione in corso...",
                    },
                }));

                const executeResponse = await fetch(command.operation!.endpoint, {
                    method: command.operation!.method,
                    headers: {
                        "Content-Type": "application/json",
                        "x-site-id": siteId,
                    },
                    body: JSON.stringify(command.operation!.body),
                });
                const executePayload = await executeResponse.json().catch(() => null);

                if (!executeResponse.ok) {
                    errorCount += 1;

                    setCommandExecutionStates((previous) => ({
                        ...previous,
                        [command.id]: {
                            status: "error",
                            message: formatApiErrorMessage(
                                executePayload,
                                "Errore durante l'esecuzione del comando"
                            ),
                        },
                    }));
                    continue;
                }

                successCount += 1;

                setCommandExecutionStates((previous) => ({
                    ...previous,
                    [command.id]: {
                        status: "success",
                        message: createExecutionMessage(command, executePayload),
                    },
                }));
            }

            if (successCount > 0) {
                router.refresh();
            }

            if (errorCount === 0) {
                const successMessage =
                    successCount === 1
                        ? "1 azione completata correttamente."
                        : `${successCount} azioni completate correttamente.`;
                setExecutionMessage(successMessage);

                toast({
                    title: "Esecuzione completata",
                    description: successMessage,
                });
                return;
            }

            const partialMessage =
                successCount > 0
                    ? `${successCount} azioni completate, ${errorCount} non riuscite.`
                    : `${errorCount} azioni non riuscite.`;
            setExecutionError(
                `${partialMessage} Controlla il dettaglio di ciascuna azione qui sotto.`
            );

            toast({
                variant: "destructive",
                title: "Esecuzione completata con errori",
                description: partialMessage,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Errore durante l'esecuzione dei comandi vocali";
            setExecutionError(message);

            toast({
                variant: "destructive",
                title: "Errore comando vocale",
                description: message,
            });
        } finally {
            setIsRunningCommand(false);
            setRunMode(null);
        }
    }, [commandResult, router, siteId, toast]);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen && isRecording) {
                stopRecording();
            }

            if (!nextOpen) {
                resetAssistant();
            }

            setOpen(nextOpen);
        },
        [isRecording, resetAssistant, stopRecording]
    );

    if (!isSiteRoute) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <Button
                type="button"
                className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
                onClick={() => setOpen(true)}
                title="Apri assistente vocale"
            >
                <Mic className="h-5 w-5" />
            </Button>

            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Assistente vocale
                    </SheetTitle>
                    <SheetDescription>
                        Registra un comando, leggi subito la trascrizione e lascia
                        che l&apos;assistente prepari azioni come creare progetti,
                        creare offerte o spostare card, sempre con conferma
                        manuale prima dell&apos;esecuzione.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 px-4 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                            {settingsLoading
                                ? "Caricamento AI..."
                                : useWhisper
                                ? "Whisper"
                                : "Web Speech"}
                        </Badge>
                        <Badge variant="outline">{currentScreen.label}</Badge>
                        {siteLoading && <Badge variant="outline">Caricamento sito...</Badge>}
                        {isRecording && <Badge variant="outline">Registrazione in corso</Badge>}
                        {whisperProcessing && (
                            <Badge variant="outline">Trascrizione audio...</Badge>
                        )}
                    </div>

                    {!isSupported && !settingsLoading && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                            Questo browser non supporta il riconoscimento vocale.
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={isRecording ? "destructive" : "default"}
                            className="flex-1"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={
                                siteLoading ||
                                settingsLoading ||
                                whisperProcessing ||
                                isRunningCommand
                            }
                        >
                            {isRecording ? (
                                <>
                                    <MicOff className="h-4 w-4" />
                                    Ferma registrazione
                                </>
                            ) : (
                                <>
                                    <Mic className="h-4 w-4" />
                                    Avvia registrazione
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={resetAssistant}
                            disabled={isRecording || isRunningCommand}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Pulisci
                        </Button>
                    </div>

                    {speechError && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                            <div className="flex items-center gap-2 font-medium">
                                <AlertCircle className="h-4 w-4" />
                                Errore microfono
                            </div>
                            <p className="mt-1">{speechError}</p>
                        </div>
                    )}

                    <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Trascrizione live
                        </p>
                        <p className="min-h-16 text-sm leading-6">
                            {effectiveTranscript || liveTranscript || (
                                <span className="text-muted-foreground">
                                    Prova con: &quot;{currentScreen.examples[0]}&quot; oppure
                                    &quot;{currentScreen.examples[1]}&quot;.
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">Comandi supportati nel contesto attuale</p>
                        <p className="mt-2 text-muted-foreground">
                            {currentScreen.description}
                        </p>
                        <p className="mt-2 text-muted-foreground">
                            Puoi anche concatenare piu&apos; azioni nella stessa registrazione,
                            per esempio usando &quot;poi crea...&quot; o &quot;poi sposta...&quot;.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {getVoiceCommandIntentLabels(currentScreen.allowedIntents).map(
                                (label) => (
                                    <Badge key={label} variant="secondary">
                                        {label}
                                    </Badge>
                                )
                            )}
                        </div>
                        {currentScreen.examples.map((example) => (
                            <p key={example} className="mt-2 text-muted-foreground">
                                {example}
                            </p>
                        ))}
                    </div>

                    {commandResult && (
                        <div className="space-y-3 rounded-lg border p-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <p className="text-sm font-medium">
                                    {commandResult.summary}
                                </p>
                            </div>
                            {commandResult.message && (
                                <p className="text-sm text-muted-foreground">
                                    {commandResult.message}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline">
                                    {commandResult.readyCount} pronte
                                </Badge>
                                <Badge variant="outline">
                                    {commandResult.blockedCount} da chiarire
                                </Badge>
                                <Badge variant="secondary">
                                    Conferma operatore richiesta
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                {commandResult.commands.map((command, index) => {
                                    const executionState =
                                        commandExecutionStates[command.id] || null;

                                    return (
                                        <div
                                            key={command.id}
                                            className="rounded-lg border bg-muted/20 p-3"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline">
                                                    Azione {index + 1}
                                                </Badge>
                                                <Badge
                                                    variant={
                                                        command.status === "ready"
                                                            ? "secondary"
                                                            : "outline"
                                                    }
                                                >
                                                    {command.status === "ready"
                                                        ? "Pronta"
                                                        : "Da chiarire"}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {formatIntentLabel(command.intent)}
                                                </Badge>
                                            </div>

                                            <p className="mt-2 text-sm font-medium">
                                                {command.summary}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {command.transcript}
                                            </p>

                                            {command.message && (
                                                <p
                                                    className={`mt-2 text-sm ${
                                                        command.status === "ready"
                                                            ? "text-muted-foreground"
                                                            : "text-destructive"
                                                    }`}
                                                >
                                                    {command.message}
                                                </p>
                                            )}

                                            {command.preview &&
                                                Object.keys(command.preview).length > 0 && (
                                                    <div className="mt-3 grid gap-2 rounded-lg bg-background/80 p-3 text-sm">
                                                        {Object.entries(command.preview).map(
                                                            ([key, value]) => (
                                                                <div
                                                                    key={key}
                                                                    className="flex items-center justify-between gap-3"
                                                                >
                                                                    <span className="text-muted-foreground">
                                                                        {key}
                                                                    </span>
                                                                    <span className="text-right font-medium">
                                                                        {formatPreviewValue(value)}
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}

                                            {command.clarification && (
                                                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                                                    <p className="font-medium">
                                                        Problema rilevato
                                                    </p>
                                                    <p className="mt-1">
                                                        {command.clarification.question}
                                                    </p>
                                                    {command.clarification.missingFields &&
                                                        command.clarification.missingFields
                                                            .length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {command.clarification.missingFields.map(
                                                                    (field) => (
                                                                        <Badge
                                                                            key={field}
                                                                            variant="outline"
                                                                        >
                                                                            {field}
                                                                        </Badge>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    {command.clarification.examples &&
                                                        command.clarification.examples
                                                            .length > 0 && (
                                                            <div className="mt-2 space-y-1 text-muted-foreground">
                                                                {command.clarification.examples.map(
                                                                    (example) => (
                                                                        <p key={example}>
                                                                            {example}
                                                                        </p>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            )}

                                            {executionState && (
                                                <div
                                                    className={`mt-3 rounded-lg border p-3 text-sm ${
                                                        executionState.status === "success"
                                                            ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300"
                                                            : executionState.status === "error"
                                                            ? "border-destructive/30 bg-destructive/5 text-destructive"
                                                            : "border-primary/30 bg-primary/5"
                                                    }`}
                                                >
                                                    <p className="font-medium">
                                                        {executionState.status === "success"
                                                            ? "Azione completata"
                                                            : executionState.status === "error"
                                                            ? "Azione non completata"
                                                            : "Azione in esecuzione"}
                                                    </p>
                                                    {executionState.message && (
                                                        <p className="mt-1">
                                                            {executionState.message}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {clarificationState && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-amber-600" />
                                <p className="text-sm font-medium">Chiarimento richiesto</p>
                            </div>
                            {clarificationCommandIndex >= 0 && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Serve un dettaglio aggiuntivo per l&apos;azione{" "}
                                    {clarificationCommandIndex + 1}.
                                </p>
                            )}
                            <p className="mt-2 text-sm">{clarificationState.question}</p>
                            {clarificationState.missingFields &&
                                clarificationState.missingFields.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {clarificationState.missingFields.map((field) => (
                                            <Badge key={field} variant="outline">
                                                {field}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            {clarificationState.examples &&
                                clarificationState.examples.length > 0 && (
                                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                                        {clarificationState.examples.map((example) => (
                                            <p key={example}>{example}</p>
                                        ))}
                                    </div>
                                )}
                            <div className="mt-3 flex gap-2">
                                <Input
                                    value={manualClarificationAnswer}
                                    onChange={(event) =>
                                        setManualClarificationAnswer(event.target.value)
                                    }
                                    placeholder="Scrivi un dettaglio oppure rispondi con il microfono"
                                    disabled={isRecording || isRunningCommand}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={appendTypedClarification}
                                    disabled={
                                        !manualClarificationAnswer.trim() ||
                                        isRecording ||
                                        isRunningCommand
                                    }
                                >
                                    Aggiungi
                                </Button>
                            </div>
                        </div>
                    )}

                    {executionMessage && (
                        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-700 dark:text-green-300">
                            <div className="flex items-center gap-2 font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Comando completato
                            </div>
                            <p className="mt-1">{executionMessage}</p>
                        </div>
                    )}

                    {executionError && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                            <div className="flex items-center gap-2 font-medium">
                                <AlertCircle className="h-4 w-4" />
                                Operazione non completata
                            </div>
                            <p className="mt-1">{executionError}</p>
                        </div>
                    )}
                </div>

                <SheetFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isRunningCommand}
                    >
                        Chiudi
                    </Button>
                    <Button
                        type="button"
                        onClick={handleRunCommand}
                        disabled={
                            (!effectiveTranscript.trim() &&
                                !manualClarificationAnswer.trim()) ||
                            isRecording ||
                            whisperProcessing ||
                            isRunningCommand ||
                            siteLoading
                        }
                    >
                        {isRunningCommand ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {runMode === "execution"
                                    ? "Esecuzione..."
                                    : "Analisi in corso..."}
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                {clarificationState
                                    ? "Rianalizza risposta"
                                    : "Analizza registrazione"}
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant={canExecuteCommands ? "default" : "outline"}
                        onClick={handleExecuteCommands}
                        disabled={!canExecuteCommands || isRunningCommand}
                    >
                        {isRunningCommand && runMode === "execution" ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Conferma ed esegui...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                {commandsReadyToExecute.length > 1
                                    ? `Conferma ${commandsReadyToExecute.length} azioni`
                                    : "Conferma ed esegui"}
                            </>
                        )}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
