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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Button type="submit" disabled={isDisabled} className="w-full">
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
    <Card className="max-w-lg mx-auto relative z-10">
      <CardHeader>
        <CardTitle>Edit Site</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Immagine del sito</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
                    className="w-full h-48 object-contain rounded-md bg-muted/30"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
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
                    <div className="absolute bottom-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded">
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
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    Trascina un&apos;immagine qui oppure
                  </p>
                  <p className="text-sm text-primary font-medium">
                    clicca per selezionare
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPEG, PNG, GIF, WebP - Max 5MB
                  </p>
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Site Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <Input
              type="text"
              id="subdomain"
              name="subdomain"
              value={form.subdomain}
              onChange={(e) =>
                setForm((f) => ({ ...f, subdomain: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization_id">Organization</Label>
            <Select
              value={form.organization_id}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, organization_id: value }))
              }
              required
            >
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="users">Users</Label>
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
          <SubmitButton pending={pending} uploadingImage={uploadingImage} />
          {message && (
            <div className="mt-4 p-4 rounded-md bg-green-100 text-green-700 text-sm">
              {message}
            </div>
          )}
        </form>

        {userRole === "superadmin" && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium  mb-4 ">Module Management</h3>
            <p className="text-sm  mb-4">
              Control which modules are available for this site. Only
              superadmins can modify these settings.
            </p>
            <ModuleManagementModal
              siteId={site.id}
              trigger={
                <Button variant="outline" type="button">
                  Manage Modules
                </Button>
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
