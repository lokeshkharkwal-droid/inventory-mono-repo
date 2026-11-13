import { Prisma } from '@prisma/client';

/** Shorthand Decimal constructor used across the report services. */
export const D = (v: number | string | Prisma.Decimal): Prisma.Decimal =>
  new Prisma.Decimal(v);

/**
 * Build an inclusive Prisma date filter from optional ISO bounds. Returns
 * `undefined` when neither bound is given, so a report shows ALL history until
 * the user narrows it (matches how the legacy DataTables reports behave when no
 * range is picked). `to` is pushed to end-of-day so the upper bound is inclusive.
 */
export function dateFilter(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const out: { gte?: Date; lte?: Date } = {};
  if (from) out.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    out.lte = end;
  }
  return out;
}

/** Sum a list of Decimals. */
export function sumD(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((s, v) => s.add(v), D(0));
}
