import { randomUUID } from 'node:crypto';

/**
 * Generate a human-readable document reference like `PO-20260115-AB12CD`.
 * Used when a transaction is created without a client-supplied reference
 * (mirrors the legacy per-document numbering, simplified).
 * @param prefix short document prefix (e.g. 'PO', 'SALE', 'TR', 'REQ')
 */
export function generateReference(prefix: string): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `${prefix}-${ymd}-${suffix}`;
}
