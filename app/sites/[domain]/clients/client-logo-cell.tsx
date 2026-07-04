"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

interface ClientLogoCellProps {
  domain: string;
  clientId: number;
  logoUrl?: string | null;
  displayName?: string;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export function ClientLogoCell({
  domain,
  clientId,
  logoUrl,
  displayName,
}: ClientLogoCellProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(
    logoUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);

  const openPicker = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("clients.logoInvalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("clients.logoTooLarge"));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/sites/${domain}/clients/${clientId}/logo`,
        { method: "POST", body: formData },
      );
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error || t("clients.logoError"));
      }

      setCurrentLogo(data.url);
      toast.success(t("clients.logoUploaded"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("clients.logoError"),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openPicker();
        }}
        disabled={uploading}
        aria-label={t("clients.logoUpload")}
        title={t("clients.logoUpload")}
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted outline-none ring-offset-background transition-colors hover:border-primary/50 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          uploading && "cursor-wait opacity-70",
        )}
      >
        {currentLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentLogo}
            alt={displayName || t("clients.logo")}
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
        )}

        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
