/**
 * Maps a caught API error onto react-hook-form field errors so backend failures
 * land under the relevant control instead of only in a toast. Two strategies:
 *
 *   1. Known machine-readable `error.code`s (e.g. `PRODUCT_CODE_CONFLICT`) via a
 *      caller-supplied `codeMap`.
 *   2. NestJS `ValidationPipe` messages — a `string[]` whose entries are prefixed
 *      with the offending property name (`"name should not be empty"`). Each raw
 *      message is matched (by leading token) to a known form field name.
 *
 * Returns `true` when it set at least one field error — the caller should then
 * skip its fallback `toast.error(...)`. Returns `false` when nothing mapped, so
 * the existing toast behaviour remains the default.
 */
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/http';

interface CodeMapEntry {
  /** Form field the error should attach to. */
  field: string;
  /** Override message; defaults to the server's message for that error code. */
  message?: string;
}

interface ApplyOptions {
  /** Machine-readable `error.code` → field mapping. */
  codeMap?: Record<string, CodeMapEntry>;
  /** Known form field names, used to match class-validator messages. */
  fields?: string[];
}

/** Lower-cased first token of a validation message, e.g. "name" from "name must…". */
function leadingToken(message: string): string {
  return message.trim().split(/[\s.]/, 1)[0]?.toLowerCase() ?? '';
}

export function applyApiFieldErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  options: ApplyOptions = {},
): boolean {
  if (!(err instanceof ApiError)) return false;
  const { codeMap, fields } = options;
  let applied = false;

  // 1. Known error code → field.
  const entry = codeMap && err.errorCode ? codeMap[err.errorCode] : undefined;
  if (entry) {
    setError(entry.field as Path<T>, {
      type: 'server',
      message: entry.message ?? err.statusText,
    });
    applied = true;
  }

  // 2. class-validator messages → field (by leading property token).
  if (fields?.length) {
    const byField = new Map(fields.map((f) => [f.toLowerCase(), f]));
    for (const msg of err.messages) {
      const field = byField.get(leadingToken(msg));
      if (field) {
        setError(field as Path<T>, { type: 'server', message: msg });
        applied = true;
      }
    }
  }

  return applied;
}
