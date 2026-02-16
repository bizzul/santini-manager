"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { duplicateSite } from "../actions";
import { toast } from "sonner";

export function DuplicateSiteButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const result = await duplicateSite(siteId);
      if (result.success) {
        toast.success(result.message || "Sito duplicato");
        if (result.siteId) {
          router.push(`/administration/sites/${result.siteId}`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message || "Errore durante la duplicazione");
      }
    } catch {
      toast.error("Errore durante la duplicazione");
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
      onClick={handleDuplicate}
      disabled={isDuplicating}
      title="Duplica sito"
    >
      <Copy className="h-4 w-4 mr-2" />
      {isDuplicating ? "Duplicazione..." : "Duplica"}
    </Button>
  );
}
