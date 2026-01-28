"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Mic,
    MicOff,
    Loader2,
    AlertCircle,
    CheckCircle,
    Sparkles,
    RefreshCw,
} from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { ProjectPreviewCard } from "./ProjectPreviewCard";
import type { ExtractedProject } from "@/validation/voice-input/extracted-project";
import { useToast } from "@/hooks/use-toast";
import { createBatchProjects } from "@/app/sites/[domain]/projects/actions/create-batch.action";
import { useRouter, useParams } from "next/navigation";

type DialogStep = "record" | "extract" | "review" | "create" | "success";
type SpeechProvider = "web-speech" | "whisper";

interface SiteAiSettings {
    speechProvider: SpeechProvider;
    hasAiApiKey: boolean;
    hasWhisperApiKey: boolean;
}

interface VoiceInputDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    siteId: string;
    onSuccess?: () => void;
}

export function VoiceInputDialog({
    open,
    onOpenChange,
    siteId,
    onSuccess,
}: VoiceInputDialogProps) {
    const [step, setStep] = useState<DialogStep>("record");
    const [extractedProjects, setExtractedProjects] = useState<ExtractedProject[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedProject, setEditedProject] = useState<ExtractedProject | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [extractError, setExtractError] = useState<string | null>(null);
    const [createdCount, setCreatedCount] = useState(0);
    
    // Site AI settings
    const [siteSettings, setSiteSettings] = useState<SiteAiSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);
    
    // Whisper recording state
    const [whisperRecording, setWhisperRecording] = useState(false);
    const [whisperTranscript, setWhisperTranscript] = useState("");
    const [whisperError, setWhisperError] = useState<Error | null>(null);
    const [whisperProcessing, setWhisperProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const domain = params?.domain as string;

    // Fetch site AI settings
    useEffect(() => {
        if (open && domain) {
            setSettingsLoading(true);
            fetch(`/api/sites/${domain}/ai-settings`)
                .then((res) => res.json())
                .then((data) => {
                    setSiteSettings({
                        speechProvider: data.speechProvider || "web-speech",
                        hasAiApiKey: data.hasAiApiKey || false,
                        hasWhisperApiKey: data.hasWhisperApiKey || false,
                    });
                })
                .catch((err) => {
                    console.error("Error fetching AI settings:", err);
                    // Default to web-speech
                    setSiteSettings({
                        speechProvider: "web-speech",
                        hasAiApiKey: false,
                        hasWhisperApiKey: false,
                    });
                })
                .finally(() => setSettingsLoading(false));
        }
    }, [open, domain]);

    // Determine which provider to use
    const useWhisper = siteSettings?.speechProvider === "whisper" && 
        (siteSettings?.hasWhisperApiKey || siteSettings?.hasAiApiKey);

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

    // Unified state based on provider
    const transcript = useWhisper ? "" : webTranscript;
    const fullTranscript = useWhisper ? whisperTranscript : webFullTranscript;
    const isRecording = useWhisper ? whisperRecording : webIsRecording;
    const isSupported = useWhisper ? true : webIsSupported; // Whisper uses MediaRecorder which is widely supported
    const speechError = useWhisper ? whisperError : webSpeechError;

    // Whisper recording functions
    const startWhisperRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
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
                        type: mediaRecorder.mimeType 
                    });
                    
                    const formData = new FormData();
                    formData.append("audio", audioBlob, "audio.webm");
                    formData.append("siteId", siteId);
                    formData.append("language", "it");
                    
                    const response = await fetch("/api/voice-input/transcribe", {
                        method: "POST",
                        body: formData,
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || data.message || "Errore trascrizione");
                    }
                    
                    if (data.transcript) {
                        setWhisperTranscript((prev) => 
                            prev ? `${prev} ${data.transcript}` : data.transcript
                        );
                    }
                } catch (err) {
                    setWhisperError(
                        err instanceof Error ? err : new Error("Errore durante la trascrizione")
                    );
                } finally {
                    setWhisperProcessing(false);
                }
            };
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setWhisperRecording(true);
            setWhisperError(null);
        } catch (err) {
            setWhisperError(
                new Error("Permesso microfono negato. Consenti l'accesso al microfono.")
            );
        }
    }, [siteId]);

    const stopWhisperRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
        setWhisperRecording(false);
    }, []);

    const clearWhisperTranscript = useCallback(() => {
        setWhisperTranscript("");
        setWhisperError(null);
    }, []);

    // Unified recording controls
    const startRecording = useWhisper ? startWhisperRecording : webStartRecording;
    const stopRecording = useWhisper ? stopWhisperRecording : webStopRecording;
    const clearTranscript = useWhisper ? clearWhisperTranscript : webClearTranscript;

    // Reset state when dialog opens/closes
    const handleOpenChange = useCallback(
        (newOpen: boolean) => {
            if (!newOpen) {
                // Reset everything when closing
                setStep("record");
                setExtractedProjects([]);
                setEditingIndex(null);
                setEditedProject(null);
                setIsExtracting(false);
                setIsCreating(false);
                setExtractError(null);
                setCreatedCount(0);
                // Reset both providers
                webClearTranscript();
                clearWhisperTranscript();
                if (webIsRecording) {
                    webStopRecording();
                }
                if (whisperRecording) {
                    stopWhisperRecording();
                }
            }
            onOpenChange(newOpen);
        },
        [webClearTranscript, clearWhisperTranscript, webIsRecording, whisperRecording, onOpenChange, webStopRecording, stopWhisperRecording]
    );

    // Extract projects from transcript
    const handleExtract = useCallback(async () => {
        if (!fullTranscript.trim()) {
            toast({
                title: "Nessuna trascrizione",
                description: "Registra qualcosa prima di procedere",
                variant: "destructive",
            });
            return;
        }

        setIsExtracting(true);
        setExtractError(null);
        setStep("extract");

        try {
            const response = await fetch("/api/voice-input/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transcript: fullTranscript,
                    siteId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Errore estrazione");
            }

            if (data.progetti && data.progetti.length > 0) {
                setExtractedProjects(data.progetti);
                setStep("review");
            } else {
                setExtractError("Nessun progetto trovato nella trascrizione");
                setStep("record");
            }
        } catch (error) {
            console.error("Extract error:", error);
            setExtractError(
                error instanceof Error
                    ? error.message
                    : "Errore durante l'estrazione"
            );
            setStep("record");
        } finally {
            setIsExtracting(false);
        }
    }, [fullTranscript, siteId, toast]);

    // Create projects
    const handleCreateProjects = useCallback(async () => {
        if (extractedProjects.length === 0) return;

        setIsCreating(true);
        setStep("create");

        try {
            const result = await createBatchProjects(siteId, extractedProjects);

            if (result.success) {
                setCreatedCount(result.createdCount || extractedProjects.length);
                setStep("success");
                toast({
                    title: "Progetti creati",
                    description: `${result.createdCount || extractedProjects.length} progetti creati con successo`,
                });
                // Refresh the page to show new projects
                router.refresh();
            } else {
                throw new Error(result.error || "Errore durante la creazione");
            }
        } catch (error) {
            console.error("Create error:", error);
            toast({
                title: "Errore",
                description:
                    error instanceof Error
                        ? error.message
                        : "Errore durante la creazione dei progetti",
                variant: "destructive",
            });
            setStep("review");
        } finally {
            setIsCreating(false);
        }
    }, [extractedProjects, siteId, toast, router]);

    // Edit project handlers
    const handleStartEdit = (index: number) => {
        setEditingIndex(index);
        setEditedProject({ ...extractedProjects[index] });
    };

    const handleSaveEdit = (project: ExtractedProject) => {
        if (editingIndex !== null) {
            const updated = [...extractedProjects];
            updated[editingIndex] = project;
            setExtractedProjects(updated);
        }
        setEditingIndex(null);
        setEditedProject(null);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditedProject(null);
    };

    const handleDeleteProject = (index: number) => {
        setExtractedProjects((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFieldChange = (field: keyof ExtractedProject, value: unknown) => {
        if (editedProject) {
            setEditedProject({ ...editedProject, [field]: value });
        }
    };

    // Render different steps
    const renderRecordStep = () => (
        <>
            <div className="flex flex-col items-center gap-4 py-6">
                {settingsLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                ) : !isSupported ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Il tuo browser non supporta il riconoscimento vocale. Usa Chrome,
                            Edge o Safari.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        {/* Provider indicator */}
                        <Badge variant="secondary" className="mb-2">
                            {useWhisper ? "Whisper (OpenAI)" : "Web Speech API"}
                        </Badge>

                        <Button
                            size="lg"
                            variant={isRecording ? "destructive" : "default"}
                            className="h-20 w-20 rounded-full"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={whisperProcessing}
                        >
                            {whisperProcessing ? (
                                <Loader2 className="h-8 w-8 animate-spin" />
                            ) : isRecording ? (
                                <MicOff className="h-8 w-8" />
                            ) : (
                                <Mic className="h-8 w-8" />
                            )}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            {whisperProcessing
                                ? "Trascrizione in corso..."
                                : isRecording
                                ? "Clicca per fermare la registrazione"
                                : "Clicca per iniziare a dettare i progetti"}
                        </p>

                        {isRecording && (
                            <Badge variant="outline" className="animate-pulse">
                                Registrazione in corso...
                            </Badge>
                        )}

                        {whisperProcessing && (
                            <Badge variant="outline">
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Elaborazione audio...
                            </Badge>
                        )}

                        {speechError && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{speechError.message}</AlertDescription>
                            </Alert>
                        )}

                        {extractError && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{extractError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Hint for Whisper users */}
                        {useWhisper && !isRecording && !fullTranscript && (
                            <p className="text-xs text-muted-foreground text-center max-w-sm">
                                Con Whisper la trascrizione avviene dopo aver fermato la registrazione.
                                Puoi registrare più volte per aggiungere testo.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Live transcript */}
            {(transcript || fullTranscript) && (
                <div className="border rounded-lg p-3 bg-muted/50 max-h-40 overflow-y-auto">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                        Trascrizione:
                    </p>
                    <p className="text-sm">
                        {fullTranscript}
                        {transcript && transcript !== fullTranscript && (
                            <span className="text-muted-foreground italic">
                                {" "}
                                {transcript}
                            </span>
                        )}
                    </p>
                </div>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Annulla
                </Button>
                <Button
                    onClick={handleExtract}
                    disabled={!fullTranscript.trim() || isRecording || whisperProcessing}
                >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Estrai progetti
                </Button>
            </DialogFooter>
        </>
    );

    const renderExtractStep = () => (
        <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
                Estrazione progetti in corso...
            </p>
        </div>
    );

    const renderReviewStep = () => (
        <>
            <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">
                    {extractedProjects.length} progetti trovati
                </Badge>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setStep("record");
                        setExtractedProjects([]);
                    }}
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Riprova
                </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                    {extractedProjects.map((project, index) => (
                        <ProjectPreviewCard
                            key={index}
                            project={project}
                            index={index}
                            isEditing={editingIndex === index}
                            onEdit={() => handleStartEdit(index)}
                            onSave={handleSaveEdit}
                            onCancel={handleCancelEdit}
                            onDelete={() => handleDeleteProject(index)}
                            editedProject={editedProject || project}
                            onFieldChange={handleFieldChange}
                            siteId={siteId}
                        />
                    ))}
                </div>
            </ScrollArea>

            <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Annulla
                </Button>
                <Button
                    onClick={handleCreateProjects}
                    disabled={extractedProjects.length === 0 || editingIndex !== null}
                >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Crea {extractedProjects.length} progetti
                </Button>
            </DialogFooter>
        </>
    );

    const renderCreateStep = () => (
        <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
                Creazione progetti in corso...
            </p>
        </div>
    );

    const renderSuccessStep = () => (
        <div className="flex flex-col items-center gap-4 py-12">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div className="text-center">
                <h3 className="text-lg font-semibold">Progetti creati!</h3>
                <p className="text-sm text-muted-foreground">
                    {createdCount} progetti sono stati creati con successo
                </p>
            </div>
            <Button
                onClick={() => {
                    handleOpenChange(false);
                    onSuccess?.();
                }}
            >
                Chiudi
            </Button>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mic className="h-5 w-5" />
                        Crea progetti con la voce
                    </DialogTitle>
                    <DialogDescription>
                        {step === "record" &&
                            "Dettate i dati dei progetti. L'AI estrarrà automaticamente le informazioni."}
                        {step === "extract" && "Analisi della trascrizione..."}
                        {step === "review" &&
                            "Verifica i progetti estratti e modificali se necessario."}
                        {step === "create" && "Creazione progetti..."}
                        {step === "success" && "Operazione completata!"}
                    </DialogDescription>
                </DialogHeader>

                {step === "record" && renderRecordStep()}
                {step === "extract" && renderExtractStep()}
                {step === "review" && renderReviewStep()}
                {step === "create" && renderCreateStep()}
                {step === "success" && renderSuccessStep()}
            </DialogContent>
        </Dialog>
    );
}
