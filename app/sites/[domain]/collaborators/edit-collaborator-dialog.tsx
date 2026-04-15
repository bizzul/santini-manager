"use client";

import { useState, useEffect, type ChangeEvent } from "react";
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
import { Loader2, Upload, X } from "lucide-react";
import { updateCollaborator } from "./actions";
import { Collaborator } from "./columns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    const [pictureFile, setPictureFile] = useState<File | null>(null);
    const [picturePreview, setPicturePreview] = useState<string | null>(collaborator.picture || null);
    
    const { toast } = useToast();

    // Sync state when collaborator changes or dialog opens
    useEffect(() => {
        if (isOpen) {
            setGivenName(collaborator.given_name || "");
            setFamilyName(collaborator.family_name || "");
            setCompanyRole(collaborator.company_role || "");
            setInitials(collaborator.initials || "");
            setSelectedColor(collaborator.color || AVATAR_COLORS[0]);
            setPictureFile(null);
            setPicturePreview(collaborator.picture || null);
        }
    }, [collaborator, isOpen]);

    const handlePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast({
                title: "Formato non valido",
                description: "Seleziona un'immagine valida.",
                variant: "destructive",
            });
            return;
        }
        setPictureFile(file);
        setPicturePreview(URL.createObjectURL(file));
    };

    const uploadProfilePicture = async (userId: string) => {
        if (!pictureFile) return true;
        const formData = new FormData();
        formData.append("picture", pictureFile);
        const response = await fetch(`/api/users/${userId}/picture`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data?.error || "Errore upload immagine");
        }
        return true;
    };

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
                if (collaborator.authId && pictureFile) {
                    await uploadProfilePicture(collaborator.authId);
                }
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
        } catch {
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
            <DialogContent className="sm:max-w-[740px] rounded-2xl border border-slate-700/70 bg-slate-950/95 text-slate-100">
                <DialogHeader>
                    <DialogTitle>Modifica Collaboratore</DialogTitle>
                    <DialogDescription className="text-slate-300">
                        Modifica i dati di {collaborator.given_name} {collaborator.family_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="flex items-center gap-4 rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={picturePreview || undefined} />
                            <AvatarFallback
                                className="text-white font-semibold"
                                style={{ backgroundColor: selectedColor }}
                            >
                                {initials || `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-wrap gap-2">
                            <Label
                                htmlFor="editProfilePicture"
                                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800/70"
                            >
                                <Upload className="h-4 w-4" />
                                Carica foto profilo
                            </Label>
                            <input
                                id="editProfilePicture"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePictureChange}
                            />
                            {picturePreview && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-slate-600 bg-transparent hover:bg-slate-800/70"
                                    onClick={() => {
                                        setPictureFile(null);
                                        setPicturePreview(null);
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Rimuovi foto
                                </Button>
                            )}
                        </div>
                    </div>
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
                            className="bg-slate-900/60 text-slate-300"
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

