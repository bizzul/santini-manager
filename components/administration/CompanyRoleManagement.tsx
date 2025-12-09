"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Edit, Trash2, Loader2, Briefcase } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyRole {
  id: number;
  name: string;
  site_id?: string | null;
}

interface UserRole {
  A: number; // role_id
  B: number; // user_id
}

interface Site {
  id: string;
  name: string;
  subdomain: string;
}

interface CompanyRoleManagementProps {
  userId: string;
  organizationId?: string;
  currentUserRole?: string;
}

export function CompanyRoleManagement({
  userId,
  organizationId,
  currentUserRole,
}: CompanyRoleManagementProps) {
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyRole | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("global");

  // Fetch roles and user roles
  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all roles for the organization
      const rolesResponse = await fetch(
        `/api/roles${
          organizationId ? `?organization_id=${organizationId}` : ""
        }`
      );
      const rolesData = await rolesResponse.json();

      if (rolesData.error) {
        throw new Error(rolesData.error);
      }

      setRoles(rolesData.roles || []);

      // Fetch user's current roles
      const userRolesResponse = await fetch(
        `/api/users/${userId}/company-roles`
      );
      const userRolesData = await userRolesResponse.json();

      if (userRolesData.error) {
        throw new Error(userRolesData.error);
      }

      setUserRoles(userRolesData.userRoles || []);

      // Fetch sites for the organization (if organizationId is provided)
      if (organizationId) {
        const sitesResponse = await fetch(
          `/api/organizations/${organizationId}/sites`
        );
        const sitesData = await sitesResponse.json();
        if (!sitesData.error) {
          setSites(sitesData.sites || []);
        }
      }
    } catch (error: any) {
      console.error("Error fetching role data:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare i ruoli",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          organization_id: organizationId,
          site_id: selectedSiteId === "global" ? null : selectedSiteId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Successo",
        description: "Ruolo creato con successo",
      });

      setNewRoleName("");
      setSelectedSiteId("global");
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare il ruolo",
        variant: "destructive",
      });
    }
  };

  const handleEditRole = async () => {
    if (!editingRole || !newRoleName.trim()) {
      toast({
        title: "Errore",
        description: "Il nome del ruolo è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Successo",
        description: "Ruolo aggiornato con successo",
      });

      setNewRoleName("");
      setEditingRole(null);
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il ruolo",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo ruolo?")) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

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
    }
  };

  const handleAssignRole = async (roleId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/company-roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleId }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

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
    }
  };

  const handleUnassignRole = async (roleId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/company-roles`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleId }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

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
    }
  };

  const getUserRoleIds = () => {
    return userRoles.map((ur) => ur.A);
  };

  const isUserAssignedToRole = (roleId: number) => {
    return getUserRoleIds().includes(roleId);
  };

  const canManageRoles =
    currentUserRole === "admin" || currentUserRole === "superadmin";

  const getSiteName = (siteId: string | null | undefined) => {
    if (!siteId) return null;
    const site = sites.find((s) => s.id === siteId);
    return site?.name || site?.subdomain || "Sito sconosciuto";
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
          <span className="ml-2 text-white/70">Caricamento ruoli...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Available Roles */}
      <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/10">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Ruoli Aziendali</h2>
          </div>
          {canManageRoles && (
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Ruolo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crea Nuovo Ruolo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roleName">Nome Ruolo</Label>
                    <Input
                      id="roleName"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="es. Operaio, Responsabile, Magazziniere"
                    />
                  </div>
                  <div>
                    <Label htmlFor="siteId">Sito (opzionale)</Label>
                    <Select
                      value={selectedSiteId}
                      onValueChange={setSelectedSiteId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un sito..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">
                          Globale (tutti i siti)
                        </SelectItem>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name || site.subdomain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-white/50 mt-1">
                      Seleziona &quot;Globale&quot; per un ruolo disponibile su tutti i siti
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNewRoleName("");
                        setSelectedSiteId("global");
                      }}
                    >
                      Annulla
                    </Button>
                    <Button onClick={handleCreateRole}>Crea</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-2">
          {roles.length === 0 ? (
            <p className="text-white/60 text-center py-4">
              Nessun ruolo disponibile
            </p>
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center space-x-3 flex-wrap gap-2">
                  <span className="font-medium text-white">{role.name}</span>
                  {role.site_id ? (
                    <Badge className="bg-blue-500/20 text-blue-200 border border-blue-400/50 text-xs">
                      {getSiteName(role.site_id)}
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/50 text-xs">
                      Globale
                    </Badge>
                  )}
                  {isUserAssignedToRole(role.id) && (
                    <Badge className="bg-green-500/20 text-green-200 border border-green-400/50">
                      Assegnato
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {isUserAssignedToRole(role.id) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnassignRole(role.id)}
                      className="border-white/40 text-white hover:bg-white/20"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rimuovi
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAssignRole(role.id)}
                      className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assegna
                    </Button>
                  )}
                  {canManageRoles && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingRole(role);
                          setNewRoleName(role.name);
                          setIsEditDialogOpen(true);
                        }}
                        className="border-white/40 text-white hover:bg-white/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRole(role.id)}
                        className="border-red-400/50 text-red-200 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Ruolo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRoleName">Nome Ruolo</Label>
              <Input
                id="editRoleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="es. Responsabile Senior"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingRole(null);
                  setNewRoleName("");
                }}
              >
                Annulla
              </Button>
              <Button onClick={handleEditRole}>Aggiorna</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
