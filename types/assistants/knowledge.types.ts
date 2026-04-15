export type KnowledgeScope = "common" | "vera" | "mira" | "aura";

export type KnowledgeSourceType = "doc" | "kb" | "dataset" | "code-derived";

export type KnowledgeTrustLevel = "low" | "medium" | "high";

export interface KnowledgeSource {
  id: string;
  scope: KnowledgeScope;
  type: KnowledgeSourceType;
  source: string;
  owner: string;
  trustLevel: KnowledgeTrustLevel;
  updateStrategy: string;
  requiredForMvp: boolean;
}

export interface KnowledgeQueryInput {
  scope: KnowledgeScope;
  query: string;
  limit?: number;
}

export interface KnowledgeQueryResultItem {
  sourceId: string;
  snippet: string;
  score: number;
}
