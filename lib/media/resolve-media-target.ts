/**
 * Resolves the current Full Data Manager route into a media-upload target.
 * Used by the global "Aggiungi foto / Documento" sheet so files land on the
 * record the user is actually looking at (product, error, task, document).
 */

export function extractDomainFromPath(pathname: string): string | null {
  const match = pathname.match(/\/sites\/([^/]+)/);
  return match?.[1] ?? null;
}

export type MediaTargetKind =
  | "errortracking"
  | "sellProduct"
  | "task"
  | "documento"
  | "documentiList"
  | "unbound";

export type MediaTarget = {
  kind: MediaTargetKind;
  /** Numeric/string id of the related record, when the URL contains one. */
  id?: number | string;
  /** Short Italian label shown in the capture sheet. */
  label: string;
  domain: string | null;
};

type SearchParamsLike = {
  get(name: string): string | null;
};

function parseNumericId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Maps `/sites/{domain}/...` (and optional query string) to a File-table
 * association. Unrecognised routes return `kind: "unbound"` so the sheet can
 * still save the file and tell the user how to attach it later.
 */
export function resolveMediaTarget(
  pathname: string,
  searchParams?: SearchParamsLike | null,
): MediaTarget {
  const domain = extractDomainFromPath(pathname);
  const sitePath = pathname.replace(/^\/sites\/[^/]+/, "") || "/";
  const segments = sitePath.split("/").filter(Boolean);

  const taskParam =
    searchParams?.get("task") ||
    searchParams?.get("taskId") ||
    searchParams?.get("task_id");
  const taskId = parseNumericId(taskParam ?? undefined);
  if (taskId) {
    return {
      kind: "task",
      id: taskId,
      label: `Scheda task #${taskId}`,
      domain,
    };
  }

  if (segments[0] === "products") {
    const productId = parseNumericId(segments[1]);
    if (productId && segments[1] !== "create" && segments[1] !== "edit") {
      return {
        kind: "sellProduct",
        id: productId,
        label: `Scheda prodotto #${productId}`,
        domain,
      };
    }
  }

  if (segments[0] === "errortracking") {
    const errorId =
      parseNumericId(segments[2]) || parseNumericId(segments[1]);
    if (errorId && (segments[1] === "edit" || segments.length === 2)) {
      return {
        kind: "errortracking",
        id: errorId,
        label: `Segnalazione errore #${errorId}`,
        domain,
      };
    }
    return {
      kind: "errortracking",
      label: "Nuova segnalazione errore",
      domain,
    };
  }

  if (segments[0] === "documenti") {
    const docId = segments[1];
    if (docId && docId !== "create") {
      return {
        kind: "documento",
        id: docId,
        label: "Documento corrente",
        domain,
      };
    }
    return {
      kind: "documentiList",
      label: "Modulo Documenti",
      domain,
    };
  }

  if (segments[0] === "kanban" && taskId) {
    return {
      kind: "task",
      id: taskId,
      label: `Scheda task #${taskId}`,
      domain,
    };
  }

  return {
    kind: "unbound",
    label: "Nessun record aperto",
    domain,
  };
}

export function mediaTargetSupportsDirectFileRow(target: MediaTarget): boolean {
  return (
    (target.kind === "errortracking" && typeof target.id === "number") ||
    (target.kind === "sellProduct" && typeof target.id === "number") ||
    (target.kind === "task" && typeof target.id === "number")
  );
}
