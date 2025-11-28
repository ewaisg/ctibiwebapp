import { resolveFlexibleReference, type ReferenceInput } from "@/lib/document-reference-utils";

/**
 * Normalize any reference-like input to a string id.
 * Uses resolveFlexibleReference to support DocumentReference, string id, number, and {id} shapes.
 */
export function normalizeReferenceId(
  value: ReferenceInput,
  collection: string,
  context?: string,
  warn: boolean = true
): string {
  const { id } = resolveFlexibleReference(value, { collection, context, warn });
  if (!id) return "";
  const trimmed = String(id).trim();
  if (!trimmed) return "";
  const segments = trimmed.split("/");
  return segments[segments.length - 1] ?? "";
}

/** Convenience: safe equality by id */
export function referenceIdsEqual(a: ReferenceInput, b: ReferenceInput): boolean {
  const aid = normalizeReferenceId(a, "", undefined, false);
  const bid = normalizeReferenceId(b, "", undefined, false);
  return !!aid && aid === bid;
}
