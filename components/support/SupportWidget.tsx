"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Headset, Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/lib/toast";
import { useUserContext } from "@/hooks/use-user-context";
import {
  SUPPORT_OPEN_EVENT,
  SUPPORT_PRIORITY_LABELS,
  type SupportPriority,
} from "@/lib/support/settings";
import {
  getSupportErrorBuffer,
  pushSupportError,
} from "@/lib/support/error-buffer";
import { SupportChatThread } from "@/components/support/SupportChatThread";
import type { SupportAttachment, SupportMessage } from "@/lib/support/types";

type UiMessage = SupportMessage;

type KbArticle = { id: string; title: string; excerpt?: string; bodyMd?: string };

type Category = { id: string; label: string };

function extractDomain(pathname?: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/\/sites\/([^/]+)/);
  return match?.[1] ?? null;
}

function inferModule(pathname: string): string | undefined {
  const segment = pathname.split("/").filter(Boolean)[2];
  return segment;
}

function createLocalMessage(
  role: UiMessage["role"],
  body: string,
  extra?: Partial<UiMessage>,
): UiMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId: extra?.conversationId ?? "",
    ticketId: extra?.ticketId ?? null,
    authorId: extra?.authorId ?? null,
    role,
    body,
    kbArticleIds: extra?.kbArticleIds ?? [],
    attachments: extra?.attachments ?? [],
    createdAt: new Date().toISOString(),
  };
}

export function SupportWidget({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const { userContext, loading } = useUserContext();
  const domain = extractDomain(pathname);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [mode, setMode] = useState<"chat" | "confirm" | "done">("chat");
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [source, setSource] = useState<"widget" | "error_boundary">("widget");
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isSiteRoute = Boolean(pathname?.startsWith("/sites/"));

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { query?: string; source?: "widget" | "error_boundary"; errorDigest?: string }
        | undefined;
      if (detail?.query) setInput(detail.query);
      if (detail?.source === "error_boundary") {
        setSource("error_boundary");
        setPriority("urgent");
        if (detail.query) {
          pushSupportError({
            message: detail.query,
            digest: detail.errorDigest,
          });
        }
      }
      setOpen(true);
    };
    window.addEventListener(SUPPORT_OPEN_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(SUPPORT_OPEN_EVENT, handler as EventListener);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, articles, mode]);

  useEffect(() => {
    if (!open || !domain || categories.length > 0) return;
    void fetch(`/api/support/categories?domain=${encodeURIComponent(domain)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (Array.isArray(payload.categories)) {
          setCategories(payload.categories);
        }
      })
      .catch(() => undefined);
  }, [open, domain, categories.length]);

  const greeting = useMemo(
    () =>
      createLocalMessage(
        "bot",
        "Ciao, sono l'assistente di supporto. Descrivi il problema: cerco prima una soluzione nella knowledge base, e solo se serve apro un ticket.",
      ),
    [],
  );

  const visibleMessages = messages.length > 0 ? messages : [greeting];

  if (loading || !userContext || !isSiteRoute || !enabled || !domain) {
    return null;
  }

  async function uploadIfNeeded(convId: string): Promise<SupportAttachment[]> {
    if (!pendingFile) return [];
    const form = new FormData();
    form.append("domain", domain!);
    form.append("conversationId", convId);
    form.append("file", pendingFile);
    const response = await fetch("/api/support/upload", {
      method: "POST",
      body: form,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Upload fallito");
    }
    setPendingFile(null);
    return [
      {
        path: payload.path,
        mime: payload.mime,
        size: payload.size,
        kind: payload.kind,
      },
    ];
  }

  async function sendQuery() {
    const text = input.trim();
    if (!text || sending || !userContext) return;
    setSending(true);
    try {
      const recentErrors = getSupportErrorBuffer();
      const context = {
        pathname,
        search: typeof window !== "undefined" ? window.location.search : "",
        module: inferModule(pathname || ""),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        viewport:
          typeof window !== "undefined"
            ? { width: window.innerWidth, height: window.innerHeight }
            : undefined,
        assistanceLevel: userContext.assistanceLevel,
        recentErrors,
        source,
      };

      let convId = conversationId;
      if (!convId) {
        const created = await fetch("/api/support/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, query: text, context }),
        });
        const createdPayload = await created.json();
        if (!created.ok) {
          throw new Error(createdPayload.error || "Impossibile aprire la chat");
        }
        convId = createdPayload.conversationId as string;
        setConversationId(convId);
      }

      const attachments = await uploadIfNeeded(convId);
      const userMessage = createLocalMessage("user", text, {
        conversationId: convId,
        attachments,
      });
      setMessages((current) =>
        current.length === 0 ? [greeting, userMessage] : [...current, userMessage],
      );
      setInput("");
      setSubject(text.slice(0, 80));

      const searched = await fetch("/api/support/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          conversationId: convId,
          query: text,
        }),
      });
      const searchPayload = await searched.json();
      if (!searched.ok) {
        throw new Error(searchPayload.error || "Ricerca non disponibile");
      }

      const botMessage = createLocalMessage("bot", searchPayload.reply, {
        conversationId: convId,
        kbArticleIds: (searchPayload.articles ?? []).map(
          (article: KbArticle) => article.id,
        ),
      });
      setMessages((current) => [...current, botMessage]);
      setArticles(searchPayload.articles ?? []);
      if (searchPayload.mode === "need_ticket") {
        setMode("confirm");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invio fallito");
    } finally {
      setSending(false);
    }
  }

  async function sendFeedback(articleId: string, resolved: boolean) {
    if (!conversationId) return;
    setSending(true);
    try {
      const response = await fetch("/api/support/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          conversationId,
          articleId,
          resolved,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Feedback non salvato");
      if (resolved) {
        setMode("done");
        setArticles([]);
        setMessages((current) => [
          ...current,
          createLocalMessage(
            "system",
            "Ottimo. Segnalazione chiusa senza ticket.",
          ),
        ]);
      } else {
        setMode("confirm");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Feedback fallito");
    } finally {
      setSending(false);
    }
  }

  async function createTicket() {
    if (!conversationId || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          conversationId,
          subject: subject.trim() || "Segnalazione dal widget",
          categoryId: categoryId || null,
          priority,
          source,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Creazione ticket fallita");
      setTicketNumber(payload.number);
      setMode("done");
      setArticles([]);
      setMessages((current) => [
        ...current,
        createLocalMessage(
          "system",
          `Ticket ${payload.number} aperto. Puoi seguirlo da I miei ticket.`,
        ),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ticket non creato");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label="Apri supporto tecnico"
        title="Supporto tecnico"
        className="fixed right-5 bottom-5 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Headset className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md bg-card">
          <SheetHeader>
            <SheetTitle>Supporto tecnico</SheetTitle>
            <SheetDescription>
              Knowledge base prima, ticket solo se serve.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-1">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <SupportChatThread messages={visibleMessages} />

              {mode === "chat" && articles.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-border bg-page-soft p-3">
                  <p className="text-sm font-medium">Ha risolto il problema?</p>
                  {articles.map((article) => (
                    <div key={article.id} className="rounded-md border bg-card p-2">
                      <p className="text-sm font-medium">{article.title}</p>
                      {article.excerpt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {article.excerpt}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={sending || !articles[0]}
                      onClick={() => sendFeedback(articles[0].id, true)}
                    >
                      Sì
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sending || !articles[0]}
                      onClick={() => sendFeedback(articles[0].id, false)}
                    >
                      No, apri un ticket
                    </Button>
                  </div>
                </div>
              ) : null}

              {mode === "confirm" ? (
                <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-medium">Conferma apertura ticket</p>
                  <div className="space-y-1">
                    <Label htmlFor="support-subject">Oggetto</Label>
                    <Textarea
                      id="support-subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Categoria</Label>
                      <Select
                        value={categoryId}
                        onValueChange={setCategoryId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Priorità</Label>
                      <Select
                        value={priority}
                        onValueChange={(value) =>
                          setPriority(value as SupportPriority)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SUPPORT_PRIORITY_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verranno allegati Spazio, pagina corrente, browser e gli
                    ultimi errori tecnici.
                  </p>
                  <Button disabled={sending} onClick={createTicket}>
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Apri ticket
                  </Button>
                </div>
              ) : null}

              {mode === "done" && ticketNumber ? (
                <Button asChild variant="outline" size="sm">
                  <a href={`/sites/${domain}/supporto`}>Vai a I miei ticket</a>
                </Button>
              ) : null}
              <div ref={endRef} />
            </div>

            {mode !== "done" ? (
              <div className="space-y-2 border-t border-border pt-3">
                {pendingFile ? (
                  <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
                    <span className="truncate">{pendingFile.name}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setPendingFile(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : null}
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    placeholder="Descrivi il problema…"
                    rows={2}
                    onChange={(event) => setInput(event.target.value)}
                    onPaste={(event) => {
                      const file = event.clipboardData.files?.[0];
                      if (file?.type.startsWith("image/")) {
                        setPendingFile(file);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendQuery();
                      }
                    }}
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setPendingFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Allega screenshot"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    disabled={sending || input.trim().length < 3}
                    onClick={() => void sendQuery()}
                    aria-label="Invia"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <a
                  href={`/sites/${domain}/supporto`}
                  className="block text-center text-xs text-muted-foreground underline"
                >
                  I miei ticket
                </a>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
