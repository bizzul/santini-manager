"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { duplicateOrganization } from "../actions";
import { toast } from "sonner";

export function DuplicateOrganizationButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const result = await duplicateOrganization(organizationId);
      if (result.success) {
        toast.success(result.message || "Organizzazione duplicata");
        if (result.organizationId) {
          router.push(`/administration/organizations/${result.organizationId}`);
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
      title="Duplica organizzazione"
    >
      <Copy className="h-4 w-4 mr-2" />
      {isDuplicating ? "Duplicazione..." : "Duplica"}
    </Button>
  );
}
