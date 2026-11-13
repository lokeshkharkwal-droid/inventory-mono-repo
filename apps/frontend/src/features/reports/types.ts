import type { ReactNode } from 'react';

/**
 * A single report-table column. `value` is the plain cell value used for CSV +
 * PDF export AND as the default rendered cell; `render` optionally overrides the
 * on-screen cell with rich markup (badges, formatted money) without affecting
 * the exported value. Defining a column once drives display + both exports.
 */
export interface ReportColumn<T> {
  key: string;
  header: string;
  /** Plain value for display fallback + CSV/PDF export. */
  value: (row: T) => string | number;
  /** Optional rich on-screen cell. */
  render?: (row: T) => ReactNode;
  /** Right-align numeric columns. */
  align?: 'left' | 'right';
  className?: string;
}

/** A money/number formatter shared by every report (2dp, thousands grouping). */
export function fmtMoney(v: number | undefined | null): string {
  return (v ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Quantity formatter — trims trailing zeros (e.g. 12 not 12.00, 1.5 kept). */
export function fmtQty(v: number | undefined | null): string {
  const n = v ?? 0;
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

/** Date formatter (locale date only). */
export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** Date-time formatter. */
export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

/** Join a product line list to a "Name (qty)\nName (qty)" label for a cell/export. */
export function fmtItems(
  items: { productName: string; quantity: number }[] | null | undefined,
): string {
  if (!items || items.length === 0) return '—';
  return items.map((i) => `${i.productName} (${fmtQty(i.quantity)})`).join('\n');
}
