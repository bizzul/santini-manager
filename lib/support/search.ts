import { createClient } from "@/utils/supabase/server";
import { isUsefulKbHit } from "@/lib/support/settings";
import type { SupportKbHit } from "@/lib/support/types";

type RpcRow = {
  id: string;
  title: string;
  body_md: string;
  hit_rank: number | null;
  title_sim: number | null;
};

export function excerptMd(body: string, max = 280): string {
  const plain = body.replace(/[#*_`>-]/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}…`;
}

export async function searchSupportKb(
  siteId: string,
  query: string,
  limit = 3,
): Promise<SupportKbHit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_support_kb", {
    p_site_id: siteId,
    p_query: query,
    p_limit: limit,
  });

  if (error) {
    console.error("[support-search] rpc failed", error);
    return [];
  }

  const rows = (data ?? []) as RpcRow[];
  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      bodyMd: row.body_md,
      rank: Number(row.hit_rank ?? 0),
      trgmSim: Number(row.title_sim ?? 0),
      excerpt: excerptMd(row.body_md),
    }))
    .filter((hit) => isUsefulKbHit(hit.rank, hit.trgmSim));
}

export function formatKbFallbackReply(hits: SupportKbHit[]): string {
  if (hits.length === 0) return "";
  const blocks = hits.map((hit, index) => {
    return `**${index + 1}. ${hit.title}**\n${hit.excerpt}`;
  });
  return `Ho trovato queste soluzioni nella knowledge base:\n\n${blocks.join("\n\n")}`;
}
