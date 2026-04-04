"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteWithUsers, deleteSite } from "../../actions";
import { MultiSelect } from "@/components/ui/multi-select";
import ModuleManagementModal from "@/components/module-management/ModuleManagementModal";
import KanbanCategoryManagerModal from "@/components/site-settings/KanbanCategoryManagerModal";
import InventoryCategoryManagerModal from "@/components/site-settings/InventoryCategoryManagerModal";
import ProductSettingsModal from "@/components/site-settings/ProductSettingsModal";
import FactorySettingsModal from "@/components/site-settings/FactorySettingsModal";
import HrSettingsModal from "@/components/site-settings/HrSettingsModal";
import SettingsOverviewCards from "@/components/site-settings/SettingsOverviewCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  ImageIcon,
  Loader2,
  Trash2,
  Layers,
  Package,
  Bot,
  Factory,
  Users2,
  UserCheck,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import CodeTemplatesModal from "@/components/site-settings/CodeTemplatesModal";
import AiSettingsModal from "@/components/site-settings/AiSettingsModal";
import { DangerousDeleteDialog } from "@/components/dialogs/DangerousDeleteDialog";
import { logger } from "@/lib/logger";

const ROLE_LABELS: Record<string, string> = {
  user: "Utenti",
  admin: "Admin",
  superadmin: "Superadmin",
};

function getUserDisplayName(user: any) {
  const fullName = `${user?.given_name || ""} ${user?.family_name || ""}`.trim();
  return fullName || user?.email || `Utente ${String(user?.id || "").slice(0, 8)}`;
}

function getUserInitials(user: any) {
  const fullName = `${user?.given_name || ""} ${user?.family_name || ""}`.trim();
  if (fullName) {
    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  const email = user?.email || "";
  return email.slice(0, 2).toUpperCase() || "U";
}

function SubmitButton({
  pending,
  uploadingImage,
}: {
  pending: boolean;
  uploadingImage: boolean;
}) {
  const isDisabled = pending || uploadingImage;

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={isDisabled}
      className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300 py-3 font-semibold disabled:opacity-50"
    >
      {uploadingImage ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Caricamento logo...
        </>
      ) : pending ? (
        "Salvataggio..."
      ) : (
        "Salva modifiche"
      )}
    </Button>
  );
}

export default function EditSiteForm({
  site,
  siteUsers,
  organizations,
  users,
  userRole,
}: {
  site: any;
  siteUsers: any[];
  organizations: any[];
  users: any[];
  userRole?: string;
}) {
  const [form, setForm] = useState({
    name: site.name || "",
    subdomain: site.subdomain || "",
    description: site.description || "",
    organization_id: site.organization_id || "",
    users: siteUsers.map((u: any) => u.id) || [],
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    site.logo || site.image || null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingUserPictureId, setUploadingUserPictureId] = useState<
    string | null
  >(null);
  const [dragActive, setDragActive] = useState(false);
  const [settingsSummary, setSettingsSummary] = useState<any | null>(null);
  const [userPictureOverrides, setUserPictureOverrides] = useState<
    Record<string, string | null>
  >({});
  const router = useRouter();

  const usersById = useMemo(
    () => new Map(users.map((user: any) => [user.id, user])),
    [users]
  );

  const selectedUsers = useMemo(
    () =>
      form.users
        .map((userId: string) => usersById.get(userId))
        .filter(Boolean) as any[],
    [form.users, usersById]
  );

  const activeSelectedUsers = useMemo(
    () => selectedUsers.filter((user) => user.enabled !== false),
    [selectedUsers]
  );

  const activeUserCounts = useMemo(
    () =>
      activeSelectedUsers.reduce<Record<string, number>>((acc, user) => {
        const role = user.role || "user";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {}),
    [activeSelectedUsers]
  );

  const userOptions = useMemo(
    () =>
      users.map((user: any) => ({
        value: user.id,
        label: getUserDisplayName(user),
      })),
    [users]
  );

  const activeUserCards = useMemo(
    () =>
      activeSelectedUsers.map((user) => ({
        id: user.id,
        label: getUserDisplayName(user),
        email: user.email || "",
        role: user.role || "user",
        initials: getUserInitials(user),
        picture: userPictureOverrides[user.id] ?? user.picture ?? null,
      })),
    [activeSelectedUsers, userPictureOverrides]
  );

  useEffect(() => {
    if (userRole !== "superadmin") return;

    const loadSummary = async () => {
      try {
        const response = await fetch(`/api/settings/site-summary?siteId=${site.id}`);
        const result = await response.json();
        if (response.ok) {
          setSettingsSummary(result);
        }
      } catch (error) {
        logger.error("Summary load error:", error);
      }
    };

    loadSummary();
  }, [site.id, userRole]);

  function handleUsersChange(selected: string[]) {
    setForm((current) => ({ ...current, users: selected }));
  }

  const handleImageChange = useCallback(
    (file: File | null) => {
      if (file) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
        ];
        if (!allowedTypes.includes(file.type)) {
          toast.error("Tipo file non valido. Ammessi: JPEG, PNG, GIF, WebP, SVG");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Il file supera il limite di 5MB");
          return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImageFile(null);
        setImagePreview(site.logo || site.image || null);
      }
    },
    [site.image, site.logo]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        handleImageChange(file);
      }
    },
    [handleImageChange]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const uploadImage = async (): Promise<boolean> => {
    if (!imageFile) return true;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("logo", imageFile);

      logger.debug("Uploading logo to:", `/api/site-logos/${site.id}`);

      const response = await fetch(`/api/site-logos/${site.id}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Errore nel caricamento del logo");
      }

      toast.success("Logo caricato con successo");
      setImageFile(null);
      return true;
    } catch (error: any) {
      logger.error("Upload error:", error);
      toast.error(error.message || "Errore nel caricamento del logo");
      return false;
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteImage = async () => {
    setUploadingImage(true);
    try {
      const response = await fetch(`/api/site-logos/${site.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Errore nell'eliminazione del logo");
      }

      setImagePreview(null);
      setImageFile(null);
      toast.success("Logo eliminato con successo");
    } catch (error: any) {
      toast.error(error.message || "Errore nell'eliminazione del logo");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUserPictureChange = async (
    userId: string,
    file: File | null
  ) => {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato non valido. Usa JPEG, PNG, GIF, WebP o SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La foto profilo supera il limite di 5MB");
      return;
    }

    setUploadingUserPictureId(userId);
    try {
      const formData = new FormData();
      formData.append("picture", file);

      const response = await fetch(`/api/users/${userId}/picture`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossibile caricare la foto profilo");
      }

      setUserPictureOverrides((current) => ({
        ...current,
        [userId]: result.picture || null,
      }));
      toast.success("Foto profilo aggiornata");
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento della foto");
    } finally {
      setUploadingUserPictureId(null);
    }
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      if (imageFile) {
        const uploadSuccess = await uploadImage();
        if (!uploadSuccess) {
          setPending(false);
          return;
        }
      }

      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("subdomain", form.subdomain);
      formData.set("description", form.description);
      formData.set("organization_id", form.organization_id);
      form.users.forEach((userId: string) => formData.append("users", userId));

      const result = await updateSiteWithUsers(site.id, formData);
      if (result.success) {
        router.push(`/administration/sites/${site.id}`);
        router.refresh();
      } else {
        setMessage(result.message || "Impossibile aggiornare il sito");
      }
    } catch (error: any) {
      setMessage(error.message || "Impossibile aggiornare il sito");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="text-white/80 text-sm font-medium">Logo del sito</Label>
          <div
            className={`mt-2 relative border-2 border-dashed rounded-xl p-4 transition-all ${
              dragActive
                ? "border-white bg-white/10"
                : "border-white/30 hover:border-white/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Logo sito"
                  className="w-full h-48 object-contain rounded-lg bg-white/5"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/20 hover:bg-white/30 border border-white/30 text-white shadow-sm"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(site.logo || site.image || null);
                    }}
                    disabled={uploadingImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {site.logo && !imageFile && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 shadow-sm"
                      onClick={deleteImage}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {imageFile && (
                  <div className="absolute bottom-2 left-2 bg-amber-500/80 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    Nuovo logo - sarà caricato al salvataggio
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleImageChange(file);
                  }}
                />
                <ImageIcon className="h-12 w-12 text-white/40 mb-3" />
                <p className="text-sm text-white/60 text-center">
                  Trascina il logo qui oppure
                </p>
                <p className="text-sm text-white font-medium">
                  clicca per selezionare
                </p>
                <p className="text-xs text-white/50 mt-2">
                  JPEG, PNG, GIF, WebP, SVG - Max 5MB
                </p>
              </label>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label htmlFor="name" className="text-white/80 text-sm font-medium">
              Nome sito
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
              className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
            />
          </div>
          <div>
            <Label
              htmlFor="subdomain"
              className="text-white/80 text-sm font-medium"
            >
              Sottodominio
            </Label>
            <Input
              type="text"
              id="subdomain"
              name="subdomain"
              value={form.subdomain}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subdomain: event.target.value,
                }))
              }
              required
              className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
            />
          </div>
          <div>
            <Label
              htmlFor="organization_id"
              className="text-white/80 text-sm font-medium"
            >
              Organizzazione
            </Label>
            <Select
              value={form.organization_id}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, organization_id: value }))
              }
              required
            >
              <SelectTrigger className="mt-2 w-full bg-white/10 border border-white/30 text-white rounded-lg px-4 py-3 backdrop-blur-sm">
                <SelectValue placeholder="Seleziona organizzazione" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org: any) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label
            htmlFor="description"
            className="text-white/80 text-sm font-medium"
          >
            Descrizione
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
          />
        </div>

        <div>
          <Label htmlFor="users" className="text-white/80 text-sm font-medium">
            Utenti
          </Label>
          <div className="mt-2 rounded-xl border border-white/15 bg-white/5 p-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[140px] rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/45">
                  Utenti attivi
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {activeSelectedUsers.length}
                </p>
              </div>
              {Object.entries(activeUserCounts).map(([role, count]) => (
                <div
                  key={role}
                  className="min-w-[110px] rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <p className="text-[11px] uppercase tracking-wide text-white/45">
                    {ROLE_LABELS[role] || role}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">{count}</p>
                </div>
              ))}
            </div>

            {activeUserCards.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <UserCheck className="h-4 w-4" />
                  <span>Utenti attivi selezionati</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {activeUserCards.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2"
                    >
                      <label className="relative block cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                          className="sr-only"
                          onChange={(event) =>
                            handleUserPictureChange(
                              user.id,
                              event.target.files?.[0] || null
                            )
                          }
                        />
                        <Avatar className="h-11 w-11 border border-white/20">
                          <AvatarImage
                            src={user.picture || undefined}
                            alt={user.label}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
                            {user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-white/90 text-slate-900">
                          {uploadingUserPictureId === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Camera className="h-3 w-3" />
                          )}
                        </span>
                      </label>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {user.label}
                        </p>
                        <p className="truncate text-xs text-white/50">
                          {user.email || "Nessuna email"} •{" "}
                          {ROLE_LABELS[user.role] || user.role}
                        </p>
                        <p className="mt-1 text-[11px] text-white/40">
                          Clicca sul cerchio per caricare la foto profilo
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-2">
            <MultiSelect
              options={userOptions}
              onValueChange={handleUsersChange}
              defaultValue={form.users}
              placeholder="Cerca utenti..."
              variant="default"
              animation={0}
              maxCount={4}
              className="w-full"
            />
          </div>
        </div>

        <div className="pt-2">
          <SubmitButton pending={pending} uploadingImage={uploadingImage} />
        </div>
        {message && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/20 text-red-200 border border-red-400/50 text-sm">
            {message}
          </div>
        )}
      </form>

      {userRole === "superadmin" && (
        <>
          <div className="pt-6 border-t border-white/20 space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white">
                Impostazioni del sito
              </h3>
              <p className="text-sm text-white/65 mt-1">
                Gestisci moduli, codici, prodotti, kanban, fabbrica, inventario,
                HR e AI in un unico pannello.
              </p>
            </div>

            <SettingsOverviewCards
              summary={settingsSummary}
              moduleAction={
                <ModuleManagementModal
                  siteId={site.id}
                  domain={site.subdomain}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      Gestisci moduli
                    </Button>
                  }
                />
              }
              codesAction={
                <CodeTemplatesModal
                  siteId={site.id}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      Gestisci codici
                    </Button>
                  }
                />
              }
              productsAction={
                <ProductSettingsModal
                  siteId={site.id}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Gestisci prodotti
                    </Button>
                  }
                />
              }
              kanbanAction={
                <KanbanCategoryManagerModal
                  siteId={site.id}
                  subdomain={site.subdomain}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      Gestisci kanban
                    </Button>
                  }
                />
              }
              factoryAction={
                <FactorySettingsModal
                  siteId={site.id}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Factory className="h-4 w-4 mr-2" />
                      Gestisci fabbrica
                    </Button>
                  }
                />
              }
              inventoryAction={
                <InventoryCategoryManagerModal
                  siteId={site.id}
                  subdomain={site.subdomain}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Gestisci inventario
                    </Button>
                  }
                />
              }
              hrAction={
                <HrSettingsModal
                  siteId={site.id}
                  subdomain={site.subdomain}
                  users={selectedUsers}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Users2 className="h-4 w-4 mr-2" />
                      Gestisci HR
                    </Button>
                  }
                />
              }
              aiAction={
                <AiSettingsModal
                  siteId={site.id}
                  subdomain={site.subdomain}
                  trigger={
                    <Button
                      variant="outline"
                      type="button"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      Gestisci AI, API & voice
                    </Button>
                  }
                />
              }
            />
          </div>

          <div className="pt-6 border-t border-red-500/30">
            <h3 className="text-lg font-medium text-red-400 mb-4">
              Zona Pericolosa
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Elimina questo sito e tutti i dati associati. Questa azione è
              irreversibile e rimuoverà permanentemente tutti i progetti,
              l&apos;inventario, i clienti, i fornitori e le configurazioni.
            </p>
            <DangerousDeleteDialog
              trigger={
                <Button
                  variant="outline"
                  type="button"
                  className="border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all duration-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina Sito
                </Button>
              }
              title="Elimina Sito"
              description={`Stai per eliminare il sito "${site.name}" e tutti i dati collegati.`}
              confirmationText={site.name}
              warningItems={[
                "Tutti i progetti e le attività kanban",
                "Tutto l'inventario e i prodotti",
                "Tutti i clienti e i fornitori",
                "Tutte le offerte",
                "Tutti i tracciamenti temporali",
                "Tutte le configurazioni e impostazioni del sito",
              ]}
              onConfirm={async () => {
                const result = await deleteSite(site.id);
                if (result.success) {
                  toast.success(result.message || "Sito eliminato con successo");
                  router.push("/administration");
                } else {
                  throw new Error(
                    result.message || "Errore durante l'eliminazione"
                  );
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
