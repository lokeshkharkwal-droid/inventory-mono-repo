import { KaltrosException } from '../exceptions/kaltros.exception';

/** Per-row outcome of a bulk import run. */
export interface ImportRowResult {
  index: number;
  ref: string;
  status: 'created' | 'validated' | 'error';
  error?: string;
}

/** Summary returned by a bulk import run (shared across every import endpoint). */
export interface ImportSummary {
  total: number;
  created: number;
  validated: number;
  errors: number;
  dryRun: boolean;
  results: ImportRowResult[];
}

/** Handlers that adapt a generic row to a specific module's create flow. */
export interface BulkImportHandlers<T> {
  /** A human-readable identifier for the row (shown in the per-row result). */
  ref: (row: T) => string;
  /** Throw to reject a row during the dry-run preview (shape/required checks). */
  validate?: (row: T) => void | Promise<void>;
  /** Persist the row (only called when `dryRun` is false). */
  create: (row: T) => Promise<unknown>;
}

/**
 * Run a preview-or-commit bulk import over `rows`, isolating per-row failures so
 * a bad row never aborts the batch. This is the single pipeline every module's
 * CSV/Excel import builds on (mirrors the legacy import → preview → commit flow):
 * the frontend parses the file into rows, previews with `dryRun: true`, then
 * commits with `dryRun: false`.
 */
export async function runBulkImport<T>(
  rows: T[],
  dryRun: boolean,
  handlers: BulkImportHandlers<T>,
): Promise<ImportSummary> {
  const results: ImportRowResult[] = [];
  let created = 0;
  let validated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as T;
    const ref = safeRef(() => handlers.ref(row));
    try {
      if (dryRun) {
        if (handlers.validate) await handlers.validate(row);
        validated++;
        results.push({ index: i, ref, status: 'validated' });
      } else {
        await handlers.create(row);
        created++;
        results.push({ index: i, ref, status: 'created' });
      }
    } catch (err) {
      errors++;
      results.push({ index: i, ref, status: 'error', error: messageOf(err) });
    }
  }

  return { total: rows.length, created, validated, errors, dryRun, results };
}

function safeRef(fn: () => string): string {
  try {
    return fn() || '';
  } catch {
    return '';
  }
}

function messageOf(err: unknown): string {
  if (err instanceof KaltrosException) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}
