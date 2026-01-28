"use client";

import React, { useState, useCallback } from "react";
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
import { useRouter } from "next/navigation";

type DialogStep = "record" | "extract" | "review" | "create" | "success";

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

    const { toast } = useToast();
    const router = useRouter();

    const {
        transcript,
        fullTranscript,
        isRecording,
        isSupported,
        error: speechError,
        start: startRecording,
        stop: stopRecording,
        clear: clearTranscript,
    } = useSpeechToText({
        language: "it-IT",
        continuous: true,
        interimResults: true,
    });

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
                clearTranscript();
                if (isRecording) {
                    stopRecording();
                }
            }
            onOpenChange(newOpen);
        },
        [clearTranscript, isRecording, onOpenChange, stopRecording]
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
                {!isSupported ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Il tuo browser non supporta il riconoscimento vocale. Usa Chrome,
                            Edge o Safari.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <Button
                            size="lg"
                            variant={isRecording ? "destructive" : "default"}
                            className="h-20 w-20 rounded-full"
                            onClick={isRecording ? stopRecording : startRecording}
                        >
                            {isRecording ? (
                                <MicOff className="h-8 w-8" />
                            ) : (
                                <Mic className="h-8 w-8" />
                            )}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            {isRecording
                                ? "Clicca per fermare la registrazione"
                                : "Clicca per iniziare a dettare i progetti"}
                        </p>

                        {isRecording && (
                            <Badge variant="outline" className="animate-pulse">
                                Registrazione in corso...
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
                    disabled={!fullTranscript.trim() || isRecording}
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
