import { KNOWLEDGE_SOURCES_V1 } from "@/config/assistants/knowledge-sources.config";
import type {
  KnowledgeQueryInput,
  KnowledgeQueryResultItem,
  KnowledgeScope,
} from "@/types/assistants";
import type { IAssistantKnowledgeService } from "@/services/assistants/knowledge-service.interface";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export class AssistantKnowledgeService implements IAssistantKnowledgeService {
  async search(input: KnowledgeQueryInput): Promise<KnowledgeQueryResultItem[]> {
    const query = normalize(input.query || "");
    const sources = KNOWLEDGE_SOURCES_V1.filter((source) => source.scope === input.scope);
    const limit = Math.max(1, input.limit || 5);

    if (!query) {
      return sources.slice(0, limit).map((source, index) => ({
        sourceId: source.id,
        snippet: `${source.id} (${source.source})`,
        score: 1 - index * 0.1,
      }));
    }

    const queryTokens = query.split(/\s+/).filter(Boolean);

    return sources
      .map((source) => {
        const haystack = normalize(
          `${source.id} ${source.source} ${source.type} ${source.owner} ${source.updateStrategy}`
        );
        const tokenScore = queryTokens.reduce((score, token) => {
          if (haystack.includes(token)) return score + 1;
          return score;
        }, 0);

        return {
          sourceId: source.id,
          snippet: `${source.id} (${source.source})`,
          score: tokenScore / Math.max(1, queryTokens.length),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getSourcesByScope(scope: KnowledgeScope): string[] {
    return KNOWLEDGE_SOURCES_V1.filter((source) => source.scope === scope).map(
      (source) => source.id
    );
  }
}
