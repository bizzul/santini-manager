"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Edit, Trash2 } from "lucide-react";
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

interface CompanyRole {
  id: number;
  name: string;
  site_id?: string;
}

interface UserRole {
  A: number; // role_id
  B: number; // user_id
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
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyRole | null>(null);
  const [newRoleName, setNewRoleName] = useState("");

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
    } catch (error: any) {
      console.error("Error fetching role data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch role data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
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
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: "Role created successfully",
      });

      setNewRoleName("");
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    }
  };

  const handleEditRole = async () => {
    if (!editingRole || !newRoleName.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
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
        title: "Success",
        description: "Role updated successfully",
      });

      setNewRoleName("");
      setEditingRole(null);
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) {
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
        title: "Success",
        description: "Role deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
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
        title: "Success",
        description: "Role assigned successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
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
        title: "Success",
        description: "Role unassigned successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unassign role",
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

  if (loading) {
    return <div>Loading role data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Available Roles */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Company Roles</CardTitle>
            {canManageRoles && (
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="roleName">Role Name</Label>
                      <Input
                        id="roleName"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g., Mechanic, CNC Operator, Quality Checker"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRole}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {roles.length === 0 ? (
              <p className="text-muted-foreground">No roles available</p>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{role.name}</span>
                    {isUserAssignedToRole(role.id) && (
                      <Badge variant="secondary">Assigned</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isUserAssignedToRole(role.id) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnassignRole(role.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Unassign
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAssignRole(role.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Assign
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRole(role.id)}
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
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRoleName">Role Name</Label>
              <Input
                id="editRoleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Senior Mechanic"
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
                Cancel
              </Button>
              <Button onClick={handleEditRole}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
