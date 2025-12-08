"use client";

import { useState, useEffect } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { updateCollaborator } from "./actions";
import { Collaborator } from "./columns";

interface EditCollaboratorDialogProps {
    collaborator: Collaborator;
    siteId: string;
    domain: string;
    isOpen: boolean;
    onClose: () => void;
}

// Predefined colors for user avatars
const AVATAR_COLORS = [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#d946ef", // Fuchsia
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#84cc16", // Lime
    "#22c55e", // Green
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#0ea5e9", // Sky
    "#3b82f6", // Blue
];

export function EditCollaboratorDialog({
    collaborator,
    siteId,
    domain,
    isOpen,
    onClose,
}: EditCollaboratorDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [givenName, setGivenName] = useState(collaborator.given_name || "");
    const [familyName, setFamilyName] = useState(collaborator.family_name || "");
    const [companyRole, setCompanyRole] = useState(collaborator.company_role || "");
    const [initials, setInitials] = useState(collaborator.initials || "");
    const [selectedColor, setSelectedColor] = useState(collaborator.color || AVATAR_COLORS[0]);
    
    const { toast } = useToast();

    // Sync state when collaborator changes or dialog opens
    useEffect(() => {
        if (isOpen) {
            setGivenName(collaborator.given_name || "");
            setFamilyName(collaborator.family_name || "");
            setCompanyRole(collaborator.company_role || "");
            setInitials(collaborator.initials || "");
            setSelectedColor(collaborator.color || AVATAR_COLORS[0]);
        }
    }, [collaborator, isOpen]);

    const handleSave = async () => {
        if (!givenName || !familyName) {
            toast({
                title: "Errore",
                description: "Nome e cognome sono obbligatori",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await updateCollaborator(
                siteId,
                collaborator.authId || "",
                {
                    given_name: givenName,
                    family_name: familyName,
                    company_role: companyRole || undefined,
                    initials: initials || `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase(),
                    color: selectedColor,
                },
                domain
            );

            if (result.success) {
                toast({
                    title: "Successo",
                    description: result.message,
                });
                onClose();
            } else {
                toast({
                    title: "Errore",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Errore",
                description: "Si è verificato un errore",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-generate initials when name changes
    const updateInitials = (newGivenName: string, newFamilyName: string) => {
        const newInitials = `${newGivenName.charAt(0) || ""}${newFamilyName.charAt(0) || ""}`.toUpperCase();
        setInitials(newInitials);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Modifica Collaboratore</DialogTitle>
                    <DialogDescription>
                        Modifica i dati di {collaborator.given_name} {collaborator.family_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="editGivenName">Nome *</Label>
                            <Input
                                id="editGivenName"
                                value={givenName}
                                onChange={(e) => {
                                    setGivenName(e.target.value);
                                    updateInitials(e.target.value, familyName);
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="editFamilyName">Cognome *</Label>
                            <Input
                                id="editFamilyName"
                                value={familyName}
                                onChange={(e) => {
                                    setFamilyName(e.target.value);
                                    updateInitials(givenName, e.target.value);
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="editEmail">Email</Label>
                        <Input
                            id="editEmail"
                            value={collaborator.email}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            L&apos;email non può essere modificata
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="editCompanyRole">Ruolo in Azienda</Label>
                        <Input
                            id="editCompanyRole"
                            placeholder="es. Sviluppatore, Manager, Operaio..."
                            value={companyRole}
                            onChange={(e) => setCompanyRole(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="editInitials">Iniziali</Label>
                        <Input
                            id="editInitials"
                            maxLength={3}
                            value={initials}
                            onChange={(e) => setInitials(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Colore Avatar</Label>
                        <div className="flex flex-wrap gap-2">
                            {AVATAR_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                                        selectedColor === color
                                            ? "border-foreground scale-110"
                                            : "border-transparent hover:scale-105"
                                    }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setSelectedColor(color)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Annulla
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isLoading || !givenName || !familyName}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            "Salva Modifiche"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

