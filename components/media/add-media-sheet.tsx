"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileMediaCapture } from "@/components/media/mobile-media-capture";
import { useMediaCapture } from "@/components/media/media-capture-context";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import {
  extractDomainFromPath,
  mediaTargetSupportsDirectFileRow,
  resolveMediaTarget,
  type MediaTarget,
} from "@/lib/media/resolve-media-target";

type SiteData = { id: string; name?: string };

async function fetchSiteData(domain: string): Promise<SiteData | null> {
  const response = await fetch(`/api/sites/${domain}`);
  if (!response.ok) return null;
  return response.json();
}

async function persistFile(file: File, target: MediaTarget): Promise<void> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop() || "bin";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("files")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("files").getPublicUrl(filePath);

  const body: Record<string, unknown> = {
    name: file.name,
    url: publicUrl,
    storage_path: filePath,
  };
  if (target.kind === "task" && typeof target.id === "number") {
    body.taskId = target.id;
  }
  if (target.kind === "sellProduct" && typeof target.id === "number") {
    body.sellProductId = target.id;
  }
  if (target.kind === "errortracking" && typeof target.id === "number") {
    body.errortrackingId = target.id;
  }

  const response = await fetch("/api/files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error(result.error || "Salvataggio del file non riuscito");
  }
}

function targetHint(target: MediaTarget, hasSink: boolean, sinkLabel?: string) {
  if (hasSink && sinkLabel) {
    return `I file verranno inseriti in: ${sinkLabel}.`;
  }
  if (mediaTargetSupportsDirectFileRow(target)) {
    return `I file verranno collegati a: ${target.label}.`;
  }
  if (target.kind === "documentiList" || target.kind === "documento") {
    return "Apri o crea un documento per allegare il file alla pratica. Qui viene salvato comunque nell'archivio file.";
  }
  if (target.kind === "errortracking") {
    return "Apri o crea una segnalazione per collegare le foto. Il file viene comunque salvato.";
  }
  return "Nessuna scheda aperta: il file viene salvato in archivio. Aprilo dalla scheda record per collegarlo.";
}

/**
 * Global bottom-sheet opened from the mobile nav FAB. Prefers a registered
 * form sink (create/edit screens) so the file lands in the open record;
 * otherwise associates via the current URL or saves unbound.
 */
export function AddMediaSheet() {
  const { sink, sheetOpen, setSheetOpen } = useMediaCapture();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(
    () => resolveMediaTarget(pathname, searchParams),
    [pathname, searchParams],
  );
  const domain = target.domain ?? extractDomainFromPath(pathname);

  const { data: siteData } = useQuery({
    queryKey: ["site-data", domain],
    queryFn: () => fetchSiteData(domain!),
    enabled: !!domain,
    staleTime: 15 * 60 * 1000,
  });

  const handleConfirm = useCallback(
    async (files: File[]) => {
      setBusy(true);
      setError(null);
      setProgress(15);
      try {
        if (sink) {
          setProgress(55);
          await sink.onFiles(files);
        } else {
          const total = files.length;
          for (let index = 0; index < total; index += 1) {
            await persistFile(files[index], target);
            setProgress(Math.round(((index + 1) / total) * 100));
          }
        }
        toast({
          description: sink
            ? `File inserito in ${sink.label}.`
            : mediaTargetSupportsDirectFileRow(target)
              ? `File collegato a ${target.label}.`
              : "File salvato in archivio.",
        });
        setSheetOpen(false);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Caricamento non riuscito. Controlla rete e dimensione file.";
        setError(message);
        toast({ variant: "destructive", description: message });
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [sink, target, toast, setSheetOpen],
  );

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Aggiungi foto / Documento</SheetTitle>
          <SheetDescription>
            {targetHint(target, Boolean(sink), sink?.label)}
            {siteData?.name ? ` Spazio: ${siteData.name}.` : null}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <MobileMediaCapture
            multiple
            busy={busy}
            progress={progress}
            error={error}
            confirmLabel={
              sink ? `Inserisci in ${sink.label}` : "Carica nel record"
            }
            onConfirm={handleConfirm}
            onCancel={() => setSheetOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
