"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2, Upload, X } from "lucide-react";
import { inviteNewCollaborator } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AddCollaboratorDialogProps {
    siteId: string;
    domain: string;
}

export function AddCollaboratorDialog({ siteId, domain }: AddCollaboratorDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserGivenName, setNewUserGivenName] = useState("");
    const [newUserFamilyName, setNewUserFamilyName] = useState("");
    const [newUserCompanyRole, setNewUserCompanyRole] = useState("");
    const [initials, setInitials] = useState("");
    const [selectedColor, setSelectedColor] = useState("#6366f1");
    const [pictureFile, setPictureFile] = useState<File | null>(null);
    const [picturePreview, setPicturePreview] = useState<string | null>(null);

    const { toast } = useToast();

    const computedInitials = useMemo(() => {
        if (initials) return initials;
        return `${newUserGivenName.charAt(0) || ""}${newUserFamilyName.charAt(0) || ""}`.toUpperCase();
    }, [initials, newUserGivenName, newUserFamilyName]);

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

    const handleInviteNew = async () => {
        if (!newUserEmail || !newUserGivenName || !newUserFamilyName) {
            toast({
                title: "Errore",
                description: "Compila tutti i campi obbligatori",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await inviteNewCollaborator(
                siteId,
                newUserEmail,
                newUserGivenName,
                newUserFamilyName,
                newUserCompanyRole || null,
                computedInitials || null,
                selectedColor || null,
                domain
            );
            if (result.success) {
                if (result.userId && pictureFile) {
                    await uploadProfilePicture(result.userId);
                }
                toast({
                    title: "Successo",
                    description: result.message,
                });
                setIsOpen(false);
                resetForm();
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

    const resetForm = () => {
        setNewUserEmail("");
        setNewUserGivenName("");
        setNewUserFamilyName("");
        setNewUserCompanyRole("");
        setInitials("");
        setSelectedColor("#6366f1");
        setPictureFile(null);
        setPicturePreview(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Aggiungi Collaboratore
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[740px] rounded-2xl border border-slate-700/70 bg-slate-950/95 text-slate-100">
                <DialogHeader>
                    <DialogTitle>Aggiungi Collaboratore</DialogTitle>
                    <DialogDescription className="text-slate-300">
                        Inserisci i dati del collaboratore e carica una foto profilo opzionale.
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
                                {computedInitials || "CL"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-wrap gap-2">
                            <Label
                                htmlFor="newProfilePicture"
                                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800/70"
                            >
                                <Upload className="h-4 w-4" />
                                Carica foto profilo
                            </Label>
                            <input
                                id="newProfilePicture"
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

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="email@esempio.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="givenName">Nome *</Label>
                            <Input
                                id="givenName"
                                placeholder="Nome"
                                value={newUserGivenName}
                                onChange={(e) => setNewUserGivenName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="familyName">Cognome *</Label>
                            <Input
                                id="familyName"
                                placeholder="Cognome"
                                value={newUserFamilyName}
                                onChange={(e) => setNewUserFamilyName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="companyRole">Ruolo in Azienda</Label>
                        <Input
                            id="companyRole"
                            placeholder="es. Sviluppatore, Manager, Operaio..."
                            value={newUserCompanyRole}
                            onChange={(e) => setNewUserCompanyRole(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="newInitials">Iniziali</Label>
                        <Input
                            id="newInitials"
                            maxLength={3}
                            value={initials}
                            onChange={(e) => setInitials(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Colore Avatar</Label>
                        <div className="flex flex-wrap gap-2">
                            {["#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"].map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`h-8 w-8 rounded-full border-2 transition-all ${
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
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                    >
                        Annulla
                    </Button>
                    <Button
                        onClick={handleInviteNew}
                        disabled={isLoading || !newUserEmail || !newUserGivenName || !newUserFamilyName}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Invio...
                            </>
                        ) : (
                            "Salva Collaboratore"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

