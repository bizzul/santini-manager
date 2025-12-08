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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2, UserPlus, Mail } from "lucide-react";
import { getAvailableUsersForSite, addCollaboratorToSite, inviteNewCollaborator } from "./actions";

interface User {
    id: number;
    authId: string | null;
    email: string;
    given_name: string | null;
    family_name: string | null;
    role: string | null;
    company_role: string | null;
}

interface AddCollaboratorDialogProps {
    siteId: string;
    domain: string;
}

export function AddCollaboratorDialog({ siteId, domain }: AddCollaboratorDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [activeTab, setActiveTab] = useState("existing");
    
    // Form state for new user invitation
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserGivenName, setNewUserGivenName] = useState("");
    const [newUserFamilyName, setNewUserFamilyName] = useState("");
    const [newUserCompanyRole, setNewUserCompanyRole] = useState("");
    
    const { toast } = useToast();

    // Fetch available users when dialog opens
    useEffect(() => {
        if (isOpen) {
            fetchAvailableUsers();
        }
    }, [isOpen]);

    const fetchAvailableUsers = async () => {
        const result = await getAvailableUsersForSite(siteId);
        if (result.success) {
            setAvailableUsers(result.users);
        } else {
            toast({
                title: "Errore",
                description: result.error,
                variant: "destructive",
            });
        }
    };

    const handleAddExisting = async () => {
        if (!selectedUserId) {
            toast({
                title: "Errore",
                description: "Seleziona un utente",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await addCollaboratorToSite(siteId, selectedUserId, domain);
            if (result.success) {
                toast({
                    title: "Successo",
                    description: result.message,
                });
                setIsOpen(false);
                setSelectedUserId("");
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
                domain
            );
            if (result.success) {
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

    const resetForm = () => {
        setNewUserEmail("");
        setNewUserGivenName("");
        setNewUserFamilyName("");
        setNewUserCompanyRole("");
        setSelectedUserId("");
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Aggiungi Collaboratore
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Aggiungi Collaboratore</DialogTitle>
                    <DialogDescription>
                        Aggiungi un collaboratore esistente o invita un nuovo utente
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="existing" className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Esistente
                        </TabsTrigger>
                        <TabsTrigger value="new" className="gap-2">
                            <Mail className="h-4 w-4" />
                            Nuovo Invito
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="space-y-4 mt-4">
                        {availableUsers.length > 0 ? (
                            <div className="space-y-2">
                                <Label>Seleziona Utente</Label>
                                <Select
                                    value={selectedUserId}
                                    onValueChange={setSelectedUserId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona un utente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableUsers.map((user) => (
                                            <SelectItem
                                                key={user.authId}
                                                value={user.authId || ""}
                                            >
                                                {user.given_name} {user.family_name} ({user.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">
                                Non ci sono utenti disponibili da aggiungere.
                                Invita un nuovo utente.
                            </p>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isLoading}
                            >
                                Annulla
                            </Button>
                            <Button
                                onClick={handleAddExisting}
                                disabled={isLoading || !selectedUserId}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Aggiunta...
                                    </>
                                ) : (
                                    "Aggiungi"
                                )}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="new" className="space-y-4 mt-4">
                        <div className="grid gap-4">
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
                                    "Invia Invito"
                                )}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

