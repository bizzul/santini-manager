"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Bot, Loader2, Plus, Upload, X } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ASSISTANT_REGISTRY } from "@/assistants/hub/AssistantRegistry";
import { upsertAssistantCollaboratorProfile } from "./actions";

interface AddAgentDialogProps {
  siteId: string;
  domain: string;
}

export function AddAgentDialog({ siteId, domain }: AddAgentDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [assistantId, setAssistantId] = useState<"vera" | "mira" | "aura">("vera");
  const [displayName, setDisplayName] = useState("Vera");
  const [roleLabel, setRoleLabel] = useState("Assistente generale del manager");
  const [initials, setInitials] = useState("VE");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const email = useMemo(() => `${assistantId}.agent@manager.local`, [assistantId]);

  const applyAssistantTemplate = (value: "vera" | "mira" | "aura") => {
    setAssistantId(value);
    const profile = ASSISTANT_REGISTRY[value];
    setDisplayName(profile.displayName);
    setRoleLabel(profile.roleSummary);
    setInitials(profile.displayName.slice(0, 2).toUpperCase());
    setPicturePreview(`/api/assistant/avatar?assistant=${value}&variant=launcher`);
    setSelectedColor(value === "vera" ? "#6366f1" : value === "mira" ? "#0ea5e9" : "#f43f5e");
    setPictureFile(null);
  };

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
          picture: uploadedPicture,
          enabled: true,
        },
        domain
      );

      if (!result.success) {
        throw new Error(result.error || "Errore salvataggio agente");
      }

      toast({
        title: "Agente pronto",
        description: `${displayName} salvata su DB e visibile in fondo alla tabella collaboratori.`,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Salvataggio agente non riuscito",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bot className="h-4 w-4" />
          Aggiungi agente
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[740px] rounded-2xl border border-slate-700/70 bg-slate-950/95 text-slate-100">
        <DialogHeader>
          <DialogTitle>Aggiungi agente</DialogTitle>
          <DialogDescription className="text-slate-300">
            Usa lo stesso layout dei collaboratori per configurare la rappresentazione dell&apos;agente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Agente</Label>
            <Select value={assistantId} onValueChange={(value) => applyAssistantTemplate(value as "vera" | "mira" | "aura")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vera">Vera</SelectItem>
                <SelectItem value="mira">Mira</SelectItem>
                <SelectItem value="aura">Aura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={picturePreview || undefined} />
              <AvatarFallback
                className="text-white font-semibold"
                style={{ backgroundColor: selectedColor }}
              >
                {initials || "AG"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Label
                htmlFor="agentProfilePicture"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800/70"
              >
                <Upload className="h-4 w-4" />
                Carica foto profilo
              </Label>
              <input
                id="agentProfilePicture"
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
              <Label>Nome</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Iniziali</Label>
              <Input value={initials} maxLength={3} onChange={(e) => setInitials(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={email} disabled className="bg-slate-900/60 text-slate-300" />
          </div>
          <div className="grid gap-2">
            <Label>Ruolo in Azienda</Label>
            <Input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} />
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
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Agente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
