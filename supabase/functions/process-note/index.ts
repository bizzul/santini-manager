/**
 * Edge Function process-note — Manager Personale (santini-manager)
 * Contratto JSON: category_slug (= area_slug), summary, actions_*, checklist.
 * Guardrail: needs_confirmation → solo pm_pending_actions, mai esecuzione.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { matchEntity } from "../_shared/matchEntity.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AgentAction = {
  label: string;
  needs_confirmation?: boolean;
};

type AgentChecklistItem = {
  label: string;
  entity_name: string | null;
};

type AgentResult = {
  category_slug: string | null;
  summary: string;
  actions_done: AgentAction[];
  actions_pending: AgentAction[];
  checklist: AgentChecklistItem[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { voice_note_id } = await req.json();
    if (!voice_note_id) {
      return json({ error: "voice_note_id richiesto" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: note, error: noteErr } = await admin
      .from("pm_voice_notes")
      .select("*")
      .eq("id", voice_note_id)
      .is("deleted_at", null)
      .single();
    if (noteErr || !note) {
      return json({ error: "Nota non trovata" }, 404);
    }

    await admin
      .from("pm_voice_notes")
      .update({ status: "processing" })
      .eq("id", note.id);

    let transcription = note.transcription as string | null;
    if (!transcription) {
      transcription =
        "(trascrizione non disponibile — collega Whisper o passa transcription)";
    }

    const { data: entities } = await admin
      .from("pm_entities")
      .select("id, name, type, aliases, deleted_at")
      .eq("user_id", note.user_id)
      .is("deleted_at", null);

    const entityList = entities ?? [];
    const entityNames = entityList.map((e) => e.name);

    const { data: aree } = await admin
      .from("aree_vita")
      .select("slug, nome")
      .eq("utente_id", note.user_id)
      .is("deleted_at", null);

    const areaSlugs = (aree ?? []).map((a) => a.slug);

    const agent = await runAgent({
      transcription,
      entityNames,
      categorySlugs: areaSlugs,
      anthropicKey,
    });

    const checklistRows = (agent.checklist ?? []).map((item, position) => {
      const entity_id = matchEntity(item.entity_name, entityList);
      return {
        user_id: note.user_id,
        voice_note_id: note.id,
        entity_id,
        label: item.label,
        done: false,
        position,
      };
    });

    if (checklistRows.length) {
      await admin.from("pm_checklist_items").insert(checklistRows);
    }

    const pending = (agent.actions_pending ?? []).filter(
      (a) => a.needs_confirmation !== false,
    );
    if (pending.length) {
      await admin.from("pm_pending_actions").insert(
        pending.map((a) => ({
          user_id: note.user_id,
          voice_note_id: note.id,
          label: a.label,
          needs_confirmation: true,
          payload: { source: "process-note" },
        })),
      );
    }

    const area_slug =
      agent.category_slug && areaSlugs.includes(agent.category_slug)
        ? agent.category_slug
        : null;

    await admin
      .from("pm_voice_notes")
      .update({
        status: "ready",
        transcription,
        summary: (agent.summary ?? "").slice(0, 200),
        area_slug,
        error_message: null,
      })
      .eq("id", note.id);

    return json({
      ok: true,
      category_slug: agent.category_slug,
      summary: agent.summary,
      actions_done: agent.actions_done,
      actions_pending: agent.actions_pending,
      checklist: agent.checklist,
    });
  } catch (err) {
    console.error("[process-note]", err);
    return json(
      { error: err instanceof Error ? err.message : "Errore interno" },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function runAgent(args: {
  transcription: string;
  entityNames: string[];
  categorySlugs: string[];
  anthropicKey: string | undefined;
}): Promise<AgentResult> {
  const fallback: AgentResult = {
    category_slug: args.categorySlugs[0] ?? null,
    summary: args.transcription.slice(0, 200),
    actions_done: [],
    actions_pending: [],
    checklist: extractHeuristicChecklist(args.transcription, args.entityNames),
  };

  if (!args.anthropicKey) return fallback;

  const system = `Sei l'agente del Matris Personal Manager. Analizzi note vocali trascritte.
Rispondi SOLO con JSON valido, senza markdown, con questa forma:
{
  "category_slug": string|null,
  "summary": string (max 200 caratteri),
  "actions_done": [{"label": string, "needs_confirmation": false}],
  "actions_pending": [{"label": string, "needs_confirmation": true}],
  "checklist": [{"label": string, "entity_name": string|null}]
}

Regole:
- category_slug deve essere uno di: ${JSON.stringify(args.categorySlugs)} oppure null (aree Wheel of Life).
- Le azioni con needs_confirmation true vanno SOLO in actions_pending e non vanno eseguite.
- La checklist è informativa (promemoria), nessuna esecuzione.
- Suddividi/etichetta la checklist in base alle entità riconosciute nella trascrizione.
- entity_name può essere SOLO uno dei nomi di questo elenco, altrimenti null — mai nomi inventati o varianti: ${JSON.stringify(args.entityNames)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": args.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system,
      messages: [
        {
          role: "user",
          content: `Trascrizione:\n${args.transcription}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("[process-note] anthropic", await res.text());
    return fallback;
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  try {
    const parsed = JSON.parse(text) as AgentResult;
    parsed.checklist = (parsed.checklist ?? []).map((c) => ({
      label: c.label,
      entity_name:
        c.entity_name && args.entityNames.includes(c.entity_name)
          ? c.entity_name
          : null,
    }));
    parsed.summary = (parsed.summary ?? "").slice(0, 200);
    return parsed;
  } catch {
    return fallback;
  }
}

function extractHeuristicChecklist(
  transcription: string,
  entityNames: string[],
): AgentChecklistItem[] {
  const found =
    entityNames.find((n) =>
      transcription.toLowerCase().includes(n.toLowerCase()),
    ) ?? null;
  return [
    {
      label: transcription.slice(0, 120) || "Seguire nota vocale",
      entity_name: found,
    },
  ];
}
