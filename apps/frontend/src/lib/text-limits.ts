/**
 * Longest rich-text note, in characters of the stored HTML, accepted for a
 * "notes" field edited with `NotesRichTextEditor` (e.g. the proforma `note`).
 * Same number kaltros-fe uses for its notes, so a note fits in either app.
 *
 * The cap is deliberately huge: it only exists so one bad save cannot write
 * megabytes into a single field. MIRRORS the backend's `@MaxLength` on the
 * proforma `note` (`apps/backend/src/modules/proforma/dto/proforma.dto.ts`) —
 * change both together.
 */
export const NOTE_MAX_LENGTH = 1_000_000;

/** The counter appears once a note reaches this share of the limit (so a normal note never shows one). */
const WARN_FROM = 0.8;

export type NoteLimitState = 'ok' | 'near' | 'over';

/**
 * Where a note stands against the limit.
 *
 * @param length characters in the note (its HTML)
 * @param max the limit (defaults to the shared one)
 * @returns "ok" below 80% of the limit, "near" from 80% to the limit inclusive, "over" above it
 */
export function noteLimitState(
  length: number,
  max: number = NOTE_MAX_LENGTH,
): NoteLimitState {
  if (length > max) return 'over';
  return length >= max * WARN_FROM ? 'near' : 'ok';
}

/** A count with thousands separators ("1,000,000"). */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
