"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Edit2, Check, X, UserCheck, UserPlus, Loader2 } from "lucide-react";
import type { ExtractedProject, MatchedClient } from "@/validation/voice-input/extracted-project";

interface ProjectPreviewCardProps {
    project: ExtractedProject;
    index: number;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (project: ExtractedProject) => void;
    onCancel: () => void;
    onDelete: () => void;
    editedProject: ExtractedProject;
    onFieldChange: (field: keyof ExtractedProject, value: unknown) => void;
    siteId: string;
}

export function ProjectPreviewCard({
    project,
    index,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    editedProject,
    onFieldChange,
    siteId,
}: ProjectPreviewCardProps) {
    const [isSearching, setIsSearching] = useState(false);
    const [localClientName, setLocalClientName] = useState(editedProject.cliente);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const lastSearchedRef = useRef<string>("");

    // Sync local state when editedProject changes (e.g., when switching between editing)
    useEffect(() => {
        setLocalClientName(editedProject.cliente);
    }, [editedProject.cliente]);

    // Search for client when name changes
    const searchClient = async (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName === lastSearchedRef.current) return;
        
        lastSearchedRef.current = trimmedName;
        setIsSearching(true);

        try {
            const response = await fetch(
                `/api/clients/search?name=${encodeURIComponent(trimmedName)}&siteId=${siteId}`
            );
            const data = await response.json();

            if (data.found && data.client) {
                // Client found - update the project
                const client: MatchedClient = data.client;
                
                // Update location from client's address
                const clientAddress = [
                    client.address,
                    client.zipCode,
                    client.city,
                ].filter(Boolean).join(", ");

                // Batch updates to avoid race conditions
                onFieldChange("matchedClient", client);
                onFieldChange("isNewClient", false);
                if (clientAddress) {
                    onFieldChange("luogo", clientAddress);
                }
            } else {
                // Client not found
                onFieldChange("matchedClient", null);
                onFieldChange("isNewClient", true);
            }
        } catch (error) {
            console.error("Error searching client:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle client name change with debounce
    const handleClientNameChange = (value: string) => {
        // Update local state immediately for responsive UI
        setLocalClientName(value);
        // Update parent state
        onFieldChange("cliente", value);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce the search (longer delay for better UX)
        debounceRef.current = setTimeout(() => {
            searchClient(value);
        }, 800);
    };

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    if (isEditing) {
        return (
            <Card className="border-primary">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                            Progetto {index + 1} - Modifica
                        </CardTitle>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onSave(editedProject)}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={onCancel}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Cliente *</Label>
                            <div className="flex items-center gap-1">
                                {isSearching ? (
                                    <Badge variant="outline" className="text-xs gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Cercando...
                                    </Badge>
                                ) : editedProject.isNewClient ? (
                                    <Badge variant="outline" className="text-xs gap-1">
                                        <UserPlus className="h-3 w-3" />
                                        Nuovo
                                    </Badge>
                                ) : editedProject.matchedClient ? (
                                    <Badge variant="secondary" className="text-xs gap-1">
                                        <UserCheck className="h-3 w-3" />
                                        Esistente
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                        <Input
                            value={localClientName}
                            onChange={(e) => handleClientNameChange(e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Luogo</Label>
                        <Input
                            value={editedProject.luogo}
                            onChange={(e) => onFieldChange("luogo", e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Tipo Prodotto</Label>
                            <Input
                                value={editedProject.tipoProdotto}
                                onChange={(e) => onFieldChange("tipoProdotto", e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Fornitore</Label>
                            <Input
                                value={editedProject.fornitore || ""}
                                onChange={(e) =>
                                    onFieldChange("fornitore", e.target.value || null)
                                }
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs">N. Pezzi</Label>
                            <Input
                                type="number"
                                value={editedProject.numeroPezzi || ""}
                                onChange={(e) =>
                                    onFieldChange(
                                        "numeroPezzi",
                                        e.target.value ? parseInt(e.target.value) : null
                                    )
                                }
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Valore (CHF)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={editedProject.valoreTotale || ""}
                                onChange={(e) =>
                                    onFieldChange(
                                        "valoreTotale",
                                        e.target.value ? parseFloat(e.target.value) : null
                                    )
                                }
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Termine Posa</Label>
                            <Input
                                type="date"
                                value={editedProject.terminePosa || ""}
                                onChange={(e) =>
                                    onFieldChange("terminePosa", e.target.value || null)
                                }
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Kanban</Label>
                        <Select
                            value={editedProject.kanban}
                            onValueChange={(value) =>
                                onFieldChange("kanban", value as "da_fare" | "gia_fatto")
                            }
                        >
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="da_fare">Da fare</SelectItem>
                                <SelectItem value="gia_fatto">Già fatto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs">Note</Label>
                        <Textarea
                            value={editedProject.note || ""}
                            onChange={(e) =>
                                onFieldChange("note", e.target.value || null)
                            }
                            className="text-sm min-h-[60px]"
                        />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">
                            Progetto {index + 1}
                        </CardTitle>
                        <Badge
                            variant={project.kanban === "gia_fatto" ? "default" : "secondary"}
                        >
                            {project.kanban === "gia_fatto" ? "Già fatto" : "Da fare"}
                        </Badge>
                    </div>
                    <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={onEdit}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Cliente:</span> {project.cliente}
                    {project.isNewClient ? (
                        <Badge variant="outline" className="text-xs gap-1">
                            <UserPlus className="h-3 w-3" />
                            Nuovo
                        </Badge>
                    ) : project.matchedClient ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                            <UserCheck className="h-3 w-3" />
                            Esistente
                        </Badge>
                    ) : null}
                </div>
                <p>
                    <span className="font-medium">Luogo:</span> {project.luogo}
                </p>
                <p>
                    <span className="font-medium">Prodotto:</span> {project.tipoProdotto}
                </p>
                {project.fornitore && (
                    <p>
                        <span className="font-medium">Fornitore:</span> {project.fornitore}
                    </p>
                )}
                <div className="flex gap-4 flex-wrap">
                    {project.numeroPezzi && (
                        <p>
                            <span className="font-medium">Pezzi:</span> {project.numeroPezzi}
                        </p>
                    )}
                    {project.valoreTotale && (
                        <p>
                            <span className="font-medium">Valore:</span>{" "}
                            {project.valoreTotale.toLocaleString("it-CH")} CHF
                        </p>
                    )}
                    {project.terminePosa && (
                        <p>
                            <span className="font-medium">Posa:</span>{" "}
                            {new Date(project.terminePosa).toLocaleDateString("it-CH")}
                        </p>
                    )}
                </div>
                {project.note && (
                    <p className="text-muted-foreground text-xs mt-2">
                        <span className="font-medium">Note:</span> {project.note}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
