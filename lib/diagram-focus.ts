/** URL segment in a diagram focus path (e.g. `cat/12/sub/foo`). */
export type FocusSegmentType = "cat" | "sub" | "type";

export interface FocusSegment {
  type: FocusSegmentType;
  value: string;
}

export function parseFocusPath(focus: string | null | undefined): FocusSegment[] {
  if (!focus) return [];
  const parts = focus.split("/").filter(Boolean);
  const segments: FocusSegment[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const type = parts[i] as FocusSegmentType;
    const value = parts[i + 1];
    if (
      value &&
      (type === "cat" || type === "sub" || type === "type")
    ) {
      segments.push({ type, value });
    }
  }
  return segments;
}

export function buildFocusPath(segments: FocusSegment[]): string {
  return segments
    .map((segment) => `${segment.type}/${segment.value}`)
    .join("/");
}

export function appendFocusSegment(
  current: string | null | undefined,
  segment: FocusSegment,
): string {
  return buildFocusPath([...parseFocusPath(current), segment]);
}

export function parentFocusPath(
  current: string | null | undefined,
): string | null {
  const segments = parseFocusPath(current);
  if (segments.length <= 1) return null;
  return buildFocusPath(segments.slice(0, -1));
}
