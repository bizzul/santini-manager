"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validation } from "@/validation/users/editInfo";
import { toast } from "@/components/ui/use-toast";
import { updateUser } from "../../../actions";
import { Loader2 } from "lucide-react";

interface EditUserFormProps {
  user: any;
  organizations: any[];
  userOrgIds: string[];
  userId: string;
  currentUserRole?: string;
}

export function EditUserForm({
  user,
  organizations,
  userOrgIds,
  userId,
  currentUserRole,
}: EditUserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role || "user");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(userOrgIds);

  // Filter available roles based on current user's role
  const availableRoles =
    currentUserRole === "superadmin"
      ? ["user", "admin", "superadmin"]
      : ["user", "admin"];

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    try {
      const formDataObj = Object.fromEntries(formData.entries());

      const data = {
        ...formDataObj,
        role: selectedRole,
        organization: selectedOrgs,
      };

      const parsed = validation.safeParse(data);
      if (!parsed.success) {
        console.log("Validation errors:", parsed.error);
        toast({
          title: "Errore di Validazione",
          description: `Controlla i dati inseriti: ${parsed.error.errors
            .map((e) => e.message)
            .join(", ")}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await updateUser(userId, parsed.data);

      toast({
        title: "Successo",
        description: "Utente aggiornato con successo!",
      });

      router.push(`/administration/users/${userId}`);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare l'utente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const toggleOrganization = (orgId: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  };

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white/80">
          Email
        </Label>
        <Input
          name="email"
          type="email"
          defaultValue={user.email}
          className="bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-white/60"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="given_name" className="text-white/80">
            Nome
          </Label>
          <Input
            name="given_name"
            type="text"
            defaultValue={user.given_name}
            className="bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-white/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="family_name" className="text-white/80">
            Cognome
          </Label>
          <Input
            name="family_name"
            type="text"
            defaultValue={user.family_name}
            className="bg-white/10 border-white/30 text-white placeholder:text-white/40 focus:border-white/60"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-white/80">
          Ruolo Sistema
        </Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="bg-white/10 border-white/30 text-white">
            <SelectValue placeholder="Seleziona ruolo..." />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-white/80">Organizzazioni</Label>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {organizations.map((org: any) => (
            <div
              key={org.id}
              onClick={() => toggleOrganization(org.id)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                selectedOrgs.includes(org.id)
                  ? "bg-white/20 border-2 border-white/50"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{org.name}</span>
                {org.code && (
                  <span className="text-white/50 text-sm">{org.code}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {selectedOrgs.length > 0 && (
          <p className="text-sm text-white/50">
            {selectedOrgs.length} organizzazion{selectedOrgs.length !== 1 ? "i" : "e"} selezionat{selectedOrgs.length !== 1 ? "e" : "a"}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-white/20 text-white border border-white/30 hover:bg-white/30"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvataggio...
          </>
        ) : (
          "Salva Modifiche"
        )}
      </Button>
    </form>
  );
}
