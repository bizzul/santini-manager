"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Loader2, MoreHorizontal, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Collaborator } from "./columns";
import { upsertAssistantCollaboratorProfile } from "./actions";

interface AgentActionsProps {
  collaborator: Collaborator;
  siteId: string;
  domain: string;
}

function getAssistantDefaultColor(assistantId: "vera" | "mira" | "aura") {
  if (assistantId === "mira") return "#0ea5e9";
  if (assistantId === "aura") return "#f43f5e";
  return "#6366f1";
}

function getDefaultAvatar(assistantId: "vera" | "mira" | "aura") {
  return `/api/assistant/avatar?assistant=${assistantId}&variant=launcher`;
}

export function AgentActions({ collaborator, siteId, domain }: AgentActionsProps) {
  const { toast } = useToast();
  const assistantId = collaborator.assistant_id;
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [initials, setInitials] = useState("");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const email = useMemo(() => {
    if (!assistantId) return collaborator.email;
    return `${assistantId}.agent@manager.local`;
  }, [assistantId, collaborator.email]);

  useEffect(() => {
    if (!isOpen || !assistantId) return;
    const nextName =
      [collaborator.given_name, collaborator.family_name]
        .filter(Boolean)
        .join(" ")
        .trim() || assistantId;
    setDisplayName(nextName);
    setRoleLabel(collaborator.company_role || "");
    setInitials(
      collaborator.initials ||
        nextName
          .split(" ")
          .map((chunk) => chunk.charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 3)
    );
    setSelectedColor(collaborator.color || getAssistantDefaultColor(assistantId));
    setPicturePreview(collaborator.picture || getDefaultAvatar(assistantId));
    setPictureFile(null);
  }, [isOpen, assistantId, collaborator]);

  if (!assistantId) {
    return null;
  }

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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let uploadedPicture: string | null = null;
      if (pictureFile) {
        const formData = new FormData();
        formData.append("picture", pictureFile);
        formData.append("siteId", siteId);
        formData.append("assistantId", assistantId);
        const uploadRes = await fetch("/api/assistants/avatar-upload", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploadJson?.error || "Errore caricamento immagine agente");
        }
        uploadedPicture = uploadJson?.path || null;
      }

      const result = await upsertAssistantCollaboratorProfile(
        siteId,
        assistantId,
        {
          displayName,
          roleSummary: roleLabel,
          initials,
          color: selectedColor,
          picture: uploadedPicture ?? picturePreview,
          enabled: collaborator.enabled,
        },
        domain
      );

      if (!result.success) {
        throw new Error(result.error || "Errore aggiornamento agente");
      }

      toast({
        title: "Agente aggiornato",
        description: `${displayName} aggiornato con successo.`,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Aggiornamento agente non riuscito",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Apri menu agente</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifica agente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[740px] rounded-2xl border border-slate-700/70 bg-slate-950/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>Modifica agente</DialogTitle>
            <DialogDescription className="text-slate-300">
              Aggiorna avatar, nome e ruolo dell&apos;agente virtuale.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex items-center gap-4 rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={picturePreview || undefined} />
                <AvatarFallback
                  className="font-semibold text-white"
                  style={{ backgroundColor: selectedColor }}
                >
                  {initials || "AG"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <Label
                  htmlFor={`agentProfilePicture-${assistantId}`}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800/70"
                >
                  <Upload className="h-4 w-4" />
                  Carica foto profilo
                </Label>
                <input
                  id={`agentProfilePicture-${assistantId}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePictureChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600 bg-transparent hover:bg-slate-800/70"
                  onClick={() => {
                    setPictureFile(null);
                    setPicturePreview(getDefaultAvatar(assistantId));
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Ripristina avatar standard
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Iniziali</Label>
                <Input
                  value={initials}
                  maxLength={3}
                  onChange={(event) =>
                    setInitials(event.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                value={email}
                disabled
                className="bg-slate-900/60 text-slate-300"
              />
            </div>
            <div className="grid gap-2">
              <Label>Ruolo in Azienda</Label>
              <Input
                value={roleLabel}
                onChange={(event) => setRoleLabel(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Colore Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "#6366f1",
                  "#8b5cf6",
                  "#d946ef",
                  "#ec4899",
                  "#f43f5e",
                  "#ef4444",
                  "#f97316",
                  "#eab308",
                  "#84cc16",
                  "#22c55e",
                  "#14b8a6",
                  "#06b6d4",
                  "#0ea5e9",
                  "#3b82f6",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? "scale-110 border-foreground"
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
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva modifiche"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
