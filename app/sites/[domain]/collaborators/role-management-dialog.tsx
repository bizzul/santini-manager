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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, X, Edit, Trash2, Loader2, Briefcase, Check } from "lucide-react";
import { Collaborator } from "./columns";

interface Role {
    id: number;
    name: string;
    site_id: string | null;
}

interface UserRoleLink {
    A: number; // role_id
    B: number; // user_id
}

interface RoleManagementDialogProps {
    collaborator: Collaborator;
    siteId: string;
    domain: string;
    isOpen: boolean;
    onClose: () => void;
}

export function RoleManagementDialog({
    collaborator,
    siteId,
    domain,
    isOpen,
    onClose,
}: RoleManagementDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [userRoleLinks, setUserRoleLinks] = useState<UserRoleLink[]>([]);
    const [userRoles, setUserRoles] = useState<Role[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editRoleName, setEditRoleName] = useState("");
    
    const { toast } = useToast();

    // Fetch data when dialog opens
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, collaborator.authId, siteId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch available roles for this site
            const rolesRes = await fetch(`/api/roles?site_id=${siteId}`);
            const rolesData = await rolesRes.json();
            
            if (rolesData.error) throw new Error(rolesData.error);
            setRoles(rolesData.roles || []);

            // Fetch user's assigned roles
            if (collaborator.authId) {
                const userRolesRes = await fetch(
                    `/api/users/${collaborator.authId}/company-roles?site_id=${siteId}`
                );
                const userRolesData = await userRolesRes.json();
                
                if (userRolesData.error) throw new Error(userRolesData.error);
                setUserRoleLinks(userRolesData.userRoles || []);
                setUserRoles(userRolesData.roles || []);
            }
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile caricare i ruoli",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isRoleAssigned = (roleId: number) => {
        return userRoleLinks.some((link) => link.A === roleId);
    };

    const handleAssignRole = async (roleId: number) => {
        if (!collaborator.authId) return;
        
        setIsSaving(true);
        try {
            const response = await fetch(
                `/api/users/${collaborator.authId}/company-roles`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roleId }),
                }
            );
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            toast({
                title: "Successo",
                description: "Ruolo assegnato con successo",
            });
            fetchData();
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile assegnare il ruolo",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnassignRole = async (roleId: number) => {
        if (!collaborator.authId) return;
        
        setIsSaving(true);
        try {
            const response = await fetch(
                `/api/users/${collaborator.authId}/company-roles`,
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roleId }),
                }
            );
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            toast({
                title: "Successo",
                description: "Ruolo rimosso con successo",
            });
            fetchData();
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile rimuovere il ruolo",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            toast({
                title: "Errore",
                description: "Il nome del ruolo è obbligatorio",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newRoleName.trim(),
                    site_id: siteId,
                }),
            });
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            toast({
                title: "Successo",
                description: "Ruolo creato con successo",
            });
            setNewRoleName("");
            setShowCreateForm(false);
            fetchData();
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile creare il ruolo",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditRole = async () => {
        if (!editingRole || !editRoleName.trim()) {
            toast({
                title: "Errore",
                description: "Il nome del ruolo è obbligatorio",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`/api/roles/${editingRole.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editRoleName.trim() }),
            });
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            toast({
                title: "Successo",
                description: "Ruolo aggiornato con successo",
            });
            setEditingRole(null);
            setEditRoleName("");
            fetchData();
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile aggiornare il ruolo",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRole = async (roleId: number) => {
        if (!confirm("Sei sicuro di voler eliminare questo ruolo?")) return;

        setIsSaving(true);
        try {
            const response = await fetch(`/api/roles/${roleId}`, {
                method: "DELETE",
            });
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            toast({
                title: "Successo",
                description: "Ruolo eliminato con successo",
            });
            fetchData();
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile eliminare il ruolo",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Gestione Ruoli Aziendali
                    </DialogTitle>
                    <DialogDescription>
                        Gestisci i ruoli aziendali per {collaborator.given_name} {collaborator.family_name}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2 text-muted-foreground">Caricamento...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Current assigned roles */}
                        {userRoles.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Ruoli Assegnati</Label>
                                <div className="flex flex-wrap gap-2">
                                    {userRoles.map((role) => (
                                        <Badge
                                            key={role.id}
                                            variant="default"
                                            className="flex items-center gap-1 pr-1"
                                        >
                                            {role.name}
                                            <button
                                                onClick={() => handleUnassignRole(role.id)}
                                                className="ml-1 rounded-full hover:bg-primary-foreground/20 p-0.5"
                                                disabled={isSaving}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Available roles to assign */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Ruoli Disponibili</Label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowCreateForm(!showCreateForm)}
                                    className="h-7 text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Nuovo Ruolo
                                </Button>
                            </div>

                            {/* Create new role form */}
                            {showCreateForm && (
                                <div className="flex gap-2 p-3 border rounded-lg bg-muted/50">
                                    <Input
                                        placeholder="Nome nuovo ruolo..."
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        className="h-8"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleCreateRole}
                                        disabled={isSaving || !newRoleName.trim()}
                                        className="h-8"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setNewRoleName("");
                                        }}
                                        className="h-8"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {/* Roles list */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {roles.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Nessun ruolo disponibile. Crea il primo ruolo!
                                    </p>
                                ) : (
                                    roles.map((role) => {
                                        const assigned = isRoleAssigned(role.id);
                                        
                                        // Edit mode for this role
                                        if (editingRole?.id === role.id) {
                                            return (
                                                <div
                                                    key={role.id}
                                                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50"
                                                >
                                                    <Input
                                                        value={editRoleName}
                                                        onChange={(e) => setEditRoleName(e.target.value)}
                                                        className="h-8"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={handleEditRole}
                                                        disabled={isSaving || !editRoleName.trim()}
                                                        className="h-8"
                                                    >
                                                        {isSaving ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditingRole(null);
                                                            setEditRoleName("");
                                                        }}
                                                        className="h-8"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={role.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{role.name}</span>
                                                    {role.site_id && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Sito
                                                        </Badge>
                                                    )}
                                                    {assigned && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Assegnato
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {assigned ? (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleUnassignRole(role.id)}
                                                            disabled={isSaving}
                                                            className="h-7 text-xs"
                                                        >
                                                            <X className="h-3 w-3 mr-1" />
                                                            Rimuovi
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleAssignRole(role.id)}
                                                            disabled={isSaving}
                                                            className="h-7 text-xs"
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            Assegna
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditingRole(role);
                                                            setEditRoleName(role.name);
                                                        }}
                                                        disabled={isSaving}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteRole(role.id)}
                                                        disabled={isSaving}
                                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Chiudi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

