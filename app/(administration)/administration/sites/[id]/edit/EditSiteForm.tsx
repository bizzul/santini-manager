"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateSiteWithUsers } from "../../actions";
import { MultiSelect } from "@/components/ui/multi-select";
import ModuleManagementModal from "@/components/module-management/ModuleManagementModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
          Caricamento immagine...
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
  const router = useRouter();

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(
    site.image || null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // MultiSelect handles add/remove internally, just update form.users
  function handleUsersChange(selected: string[]) {
    setForm((f) => ({ ...f, users: selected }));
  }

  const handleImageChange = useCallback(
    (file: File | null) => {
      if (file) {
        // Validate file type
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedTypes.includes(file.type)) {
          toast.error("Tipo file non valido. Ammessi: JPEG, PNG, GIF, WebP");
          return;
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Il file supera il limite di 5MB");
          return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImageFile(null);
        setImagePreview(site.image || null);
      }
    },
    [site.image]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleImageChange(file);
      }
    },
    [handleImageChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const uploadImage = async (): Promise<boolean> => {
    if (!imageFile) return true; // No file to upload, continue

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      console.log("Uploading image to:", `/api/site-images/${site.id}`);

      const response = await fetch(`/api/site-images/${site.id}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Upload response:", result);

      if (!response.ok) {
        throw new Error(result.error || "Errore nel caricamento dell'immagine");
      }

      toast.success("Immagine caricata con successo!");
      setImageFile(null); // Clear the file after successful upload
      return true;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Errore nel caricamento dell'immagine");
      return false;
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteImage = async () => {
    setUploadingImage(true);
    try {
      const response = await fetch(`/api/site-images/${site.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Errore nell'eliminazione dell'immagine"
        );
      }

      setImagePreview(null);
      setImageFile(null);
      toast.success("Immagine eliminata con successo!");
    } catch (error: any) {
      toast.error(error.message || "Errore nell'eliminazione dell'immagine");
    } finally {
      setUploadingImage(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      // Upload image first if there's a new one
      if (imageFile) {
        const uploadSuccess = await uploadImage();
        if (!uploadSuccess) {
          setPending(false);
          return; // Stop if image upload failed
        }
      }

      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("subdomain", form.subdomain);
      formData.set("description", form.description);
      formData.set("organization_id", form.organization_id);
      form.users.forEach((u: string) => formData.append("users", u));

      const result = await updateSiteWithUsers(site.id, formData);
      if (result.success) {
        router.push(`/administration/sites/${site.id}`);
        router.refresh(); // Force refresh to get updated data
      } else {
        setMessage(result.message || "Failed to update site");
      }
    } catch (err: any) {
      setMessage(err.message || "Failed to update site");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image Upload Section */}
        <div>
          <Label className="text-white/80 text-sm font-medium">
            Immagine del sito
          </Label>
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
                  alt="Site preview"
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
                      setImagePreview(site.image || null);
                    }}
                    disabled={uploadingImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {site.image && !imageFile && (
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
                    Nuova immagine - sarà caricata al salvataggio
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageChange(file);
                  }}
                />
                <ImageIcon className="h-12 w-12 text-white/40 mb-3" />
                <p className="text-sm text-white/60 text-center">
                  Trascina un&apos;immagine qui oppure
                </p>
                <p className="text-sm text-white font-medium">
                  clicca per selezionare
                </p>
                <p className="text-xs text-white/50 mt-2">
                  JPEG, PNG, GIF, WebP - Max 5MB
                </p>
              </label>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="name" className="text-white/80 text-sm font-medium">
            Site Name
          </Label>
          <Input
            type="text"
            id="name"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
          />
        </div>
        <div>
          <Label
            htmlFor="subdomain"
            className="text-white/80 text-sm font-medium"
          >
            Subdomain
          </Label>
          <Input
            type="text"
            id="subdomain"
            name="subdomain"
            value={form.subdomain}
            onChange={(e) =>
              setForm((f) => ({ ...f, subdomain: e.target.value }))
            }
            required
            className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
          />
        </div>
        <div>
          <Label
            htmlFor="description"
            className="text-white/80 text-sm font-medium"
          >
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="mt-2 w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
          />
        </div>
        <div>
          <Label
            htmlFor="organization_id"
            className="text-white/80 text-sm font-medium"
          >
            Organization
          </Label>
          <Select
            value={form.organization_id}
            onValueChange={(value) =>
              setForm((f) => ({ ...f, organization_id: value }))
            }
            required
          >
            <SelectTrigger className="mt-2 w-full bg-white/10 border border-white/30 text-white rounded-lg px-4 py-3 backdrop-blur-sm">
              <SelectValue placeholder="Select an organization" />
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
        <div>
          <Label htmlFor="users" className="text-white/80 text-sm font-medium">
            Users
          </Label>
          <div className="mt-2">
            <MultiSelect
              options={users.map((user: any) => ({
                value: user.id,
                label: user.email || user.name,
              }))}
              onValueChange={handleUsersChange}
              defaultValue={form.users}
              placeholder="Search users..."
              variant="default"
              animation={2}
              maxCount={3}
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
        <div className="pt-6 border-t border-white/20">
          <h3 className="text-lg font-medium text-white mb-4">
            Module Management
          </h3>
          <p className="text-sm text-white/70 mb-4">
            Control which modules are available for this site. Only superadmins
            can modify these settings.
          </p>
          <ModuleManagementModal
            siteId={site.id}
            trigger={
              <Button
                variant="outline"
                type="button"
                className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
              >
                Manage Modules
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
