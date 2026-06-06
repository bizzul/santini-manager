"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { generateSecurePassword } from "@/lib/password-utils";
import { Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { activateCollaborator } from "./actions";
import { Collaborator } from "./columns";

interface ActivateCollaboratorDialogProps {
    collaborator: Collaborator;
    siteId: string;
    domain: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ActivateCollaboratorDialog({
    collaborator,
    siteId,
    domain,
    isOpen,
    onClose,
}: ActivateCollaboratorDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(true);
    const [isActivating, setIsActivating] = useState(false);
    const [activated, setActivated] = useState(false);
    const [activatedEmail, setActivatedEmail] = useState("");

    const fullName =
        [collaborator.given_name, collaborator.family_name]
            .filter(Boolean)
            .join(" ") || collaborator.email;

    const handleGenerate = () => {
        setPassword(generateSecurePassword(12));
        setShowPassword(true);
    };

    const handleCopyCredentials = async () => {
        const text = `Email: ${activatedEmail}\nPassword: ${password}`;
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: "Copiato",
                description: "Credenziali copiate negli appunti.",
            });
        } catch {
            toast({
                title: "Errore",
                description: "Impossibile copiare negli appunti.",
                variant: "destructive",
            });
        }
    };

    const handleClose = () => {
        setPassword("");
        setShowPassword(true);
        setActivated(false);
        setActivatedEmail("");
        onClose();
    };

    const handleActivate = async () => {
        if (!password || password.length < 6) {
            toast({
                title: "Password non valida",
                description: "La password deve essere di almeno 6 caratteri.",
                variant: "destructive",
            });
            return;
        }

        setIsActivating(true);
        try {
            const result = await activateCollaborator(
                siteId,
                collaborator.authId || "",
                password,
                domain,
            );

            if (result.success) {
                setActivated(true);
                setActivatedEmail(
                    ("email" in result && result.email)
                        ? result.email
                        : collaborator.email,
                );
                toast({
                    title: "Collaboratore attivato",
                    description: result.message,
                });
                router.refresh();
            } else {
                toast({
                    title: "Errore",
                    description:
                        ("error" in result && result.error)
                            ? result.error
                            : "Si è verificato un errore.",
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
            setIsActivating(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) handleClose();
            }}
        >
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Attiva collaboratore</DialogTitle>
                    <DialogDescription>
                        {activated
                            ? (
                                <>
                                    <strong>{fullName}</strong>{" "}
                                    è stato attivato. Copia le credenziali e
                                    consegnale manualmente — nessuna email
                                    verrà inviata.
                                </>
                            )
                            : (
                                <>
                                    Imposta una password per{" "}
                                    <strong>{fullName}</strong>. Nessuna email
                                    verrà inviata.
                                </>
                            )}
                    </DialogDescription>
                </DialogHeader>

                {activated
                    ? (
                        <div className="space-y-4 rounded-md border border-border bg-muted/40 p-4">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground">
                                    Email
                                </Label>
                                <p className="font-medium">{activatedEmail}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-muted-foreground">
                                    Password
                                </Label>
                                <p className="font-mono font-medium break-all">
                                    {password}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleCopyCredentials}
                            >
                                <Copy className="h-4 w-4" />
                                Copia credenziali
                            </Button>
                        </div>
                    )
                    : (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="activate-password">
                                    Password *
                                </Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id="activate-password"
                                            type={showPassword
                                                ? "text"
                                                : "password"}
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)}
                                            placeholder="Minimo 6 caratteri"
                                            autoComplete="new-password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                                            onClick={() =>
                                                setShowPassword(!showPassword)}
                                        >
                                            {showPassword
                                                ? (
                                                    <EyeOff className="h-4 w-4" />
                                                )
                                                : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGenerate}
                                        className="gap-2 shrink-0"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Genera
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                <DialogFooter>
                    {activated
                        ? (
                            <Button type="button" onClick={handleClose}>
                                Chiudi
                            </Button>
                        )
                        : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={isActivating}
                                >
                                    Annulla
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleActivate}
                                    disabled={isActivating ||
                                        password.length < 6}
                                    className="gap-2"
                                >
                                    {isActivating
                                        ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Attivazione...
                                            </>
                                        )
                                        : (
                                            <>
                                                <KeyRound className="h-4 w-4" />
                                                Attiva
                                            </>
                                        )}
                                </Button>
                            </>
                        )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
