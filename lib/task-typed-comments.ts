export const TASK_COMMENT_TYPES = [
  "produzione",
  "posa",
  "fatturazione",
] as const;

export type TaskCommentType = (typeof TASK_COMMENT_TYPES)[number];

export type TypedComments = Record<TaskCommentType, string>;

export const TASK_COMMENT_TYPE_META: Record<
  TaskCommentType,
  { label: string; color: string }
> = {
  produzione: { label: "Produzione", color: "#EC4899" },
  posa: { label: "Posa", color: "#3B82F6" },
  fatturazione: { label: "Fatturazione", color: "#10B981" },
};

const HEADER_RE =
  /^\[(Produzione|Posa|Fatturazione)\]\s*$/im;

const LABEL_TO_TYPE: Record<string, TaskCommentType> = {
  produzione: "produzione",
  posa: "posa",
  fatturazione: "fatturazione",
};

export function emptyTypedComments(): TypedComments {
  return {
    produzione: "",
    posa: "",
    fatturazione: "",
  };
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeTypedComments(value: unknown): TypedComments {
  const empty = emptyTypedComments();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty;
  }
  const record = value as Record<string, unknown>;
  return {
    produzione: asTrimmedString(record.produzione),
    posa: asTrimmedString(record.posa),
    fatturazione: asTrimmedString(record.fatturazione),
  };
}

function hasAnyComment(comments: TypedComments): boolean {
  return TASK_COMMENT_TYPES.some((type) => comments[type].trim().length > 0);
}

export function parseLegacyOther(other?: string | null): TypedComments | null {
  if (!other?.trim()) return null;
  if (!HEADER_RE.test(other)) return null;

  const comments = emptyTypedComments();
  const lines = other.replace(/\r\n/g, "\n").split("\n");
  let current: TaskCommentType | null = null;
  const buckets: Record<TaskCommentType, string[]> = {
    produzione: [],
    posa: [],
    fatturazione: [],
  };

  for (const line of lines) {
    const match = line.match(/^\[(Produzione|Posa|Fatturazione)\]\s*$/i);
    if (match) {
      current = LABEL_TO_TYPE[match[1].toLowerCase()] ?? null;
      continue;
    }
    if (current) {
      buckets[current].push(line);
    }
  }

  for (const type of TASK_COMMENT_TYPES) {
    comments[type] = buckets[type].join("\n").trim();
  }

  return hasAnyComment(comments) ? comments : null;
}

export function parseTypedComments(input: {
  typed_comments?: unknown;
  other?: string | null;
}): TypedComments {
  const fromJson = normalizeTypedComments(input.typed_comments);
  if (hasAnyComment(fromJson)) {
    return fromJson;
  }

  const fromMarkers = parseLegacyOther(input.other);
  if (fromMarkers) {
    return fromMarkers;
  }

  if (input.other?.trim()) {
    return { ...emptyTypedComments(), produzione: input.other };
  }

  return emptyTypedComments();
}

export function serializeTypedCommentsToOther(comments: TypedComments): string {
  const parts = TASK_COMMENT_TYPES.filter((type) => comments[type]?.trim()).map(
    (type) =>
      `[${TASK_COMMENT_TYPE_META[type].label}]\n${comments[type].trim()}`,
  );
  return parts.join("\n\n");
}

export function formatTypedCommentsForDisplay(comments: TypedComments): string {
  const parts = TASK_COMMENT_TYPES.filter((type) => comments[type]?.trim()).map(
    (type) =>
      `${TASK_COMMENT_TYPE_META[type].label}\n${comments[type].trim()}`,
  );
  return parts.join("\n\n");
}
