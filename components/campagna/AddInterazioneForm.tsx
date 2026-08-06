"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  INTERAZIONE_TIPI,
  INTERAZIONE_TIPO_LABELS,
  type InterazioneTipo,
} from "@/lib/campagna/config";
import { createInterazione } from "@/app/sites/[domain]/crm/contatti/actions";

export default function AddInterazioneForm({
  domain,
  contattoId,
}: {
  domain: string;
  contattoId: string;
}) {
  const [tipo, setTipo] = useState<InterazioneTipo>("porta_a_porta");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const onSubmit = async () => {
    setSubmitting(true);
    const result = await createInterazione(domain, contattoId, { tipo, note });
    setSubmitting(false);
    if (result.success) {
      toast({ description: "Interazione registrata." });
      setNote("");
      router.refresh();
    } else {
      toast({ variant: "destructive", description: result.error });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium">Registra interazione</p>
      <Select
        value={tipo}
        onValueChange={(v) => setTipo(v as InterazioneTipo)}
      >
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INTERAZIONE_TIPI.map((t) => (
            <SelectItem key={t} value={t}>
              {INTERAZIONE_TIPO_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        rows={2}
        placeholder="Note (facoltative)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button onClick={onSubmit} disabled={submitting}>
        {submitting ? "Salvataggio..." : "Aggiungi interazione"}
      </Button>
    </div>
  );
}
