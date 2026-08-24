"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/layout/empty-state";
import { BookOpen } from "lucide-react";

type Article = {
  id: string;
  title: string;
  body_md: string;
  tags: string[];
  status: string;
  site_id: string | null;
  stats?: { yes: number; no: number };
};

export function SupportKbManager({
  articles,
  domain,
  allowGlobal,
}: {
  articles: Article[];
  domain?: string;
  allowGlobal?: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  const current = useMemo(
    () => articles.find((article) => article.id === editingId) ?? null,
    [articles, editingId],
  );

  function startNew() {
    setEditingId("new");
    setTitle("");
    setBodyMd("");
    setTags("");
    setStatus("draft");
  }

  function startEdit(article: Article) {
    setEditingId(article.id);
    setTitle(article.title);
    setBodyMd(article.body_md);
    setTags((article.tags ?? []).join(", "));
    setStatus(article.status);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        domain,
        siteId: allowGlobal && !domain ? null : undefined,
        title,
        bodyMd,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        status,
      };
      const url =
        editingId && editingId !== "new"
          ? `/api/support/kb/${editingId}`
          : "/api/support/kb";
      const response = await fetch(url, {
        method: editingId && editingId !== "new" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Salvataggio fallito");
      toast.success("Articolo salvato");
      setEditingId(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={startNew}>Nuovo articolo</Button>
        </div>
        {articles.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="Nessun articolo"
            description="Crea il primo articolo della knowledge base."
          />
        ) : (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Utile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow
                    key={article.id}
                    className="cursor-pointer"
                    onClick={() => startEdit(article)}
                  >
                    <TableCell>
                      {article.title}
                      {!article.site_id ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          globale
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      sì {article.stats?.yes ?? 0} / no {article.stats?.no ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editingId ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label>Titolo</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Soluzione (markdown)</Label>
            <Textarea
              rows={12}
              value={bodyMd}
              onChange={(event) => setBodyMd(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Tag (separati da virgola)</Label>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Stato</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="published">Pubblicato</SelectItem>
                <SelectItem value="archived">Archiviato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button disabled={saving || title.trim().length < 4} onClick={save}>
              Salva
            </Button>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Annulla
            </Button>
          </div>
          {current?.status === "published" &&
          (current.stats?.no ?? 0) > (current.stats?.yes ?? 0) &&
          (current.stats?.no ?? 0) >= 3 ? (
            <p className="text-sm text-warning">
              Questo articolo riceve più feedback negativi che positivi: conviene
              aggiornarlo.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
