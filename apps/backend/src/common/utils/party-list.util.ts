import type { Prisma } from '@prisma/client';

/** Sort direction accepted by the People list endpoints. */
export const SORT_DIRS = ['asc', 'desc'] as const;
export type SortDir = (typeof SORT_DIRS)[number];

/** A case-insensitive substring match (`ILIKE %value%`). */
export const ilike = (value: string) => ({
  contains: value,
  mode: 'insensitive' as const,
});

/**
 * Per-column filter conditions for a People list (EZ Health Track DataTables
 * column-filter row): one case-insensitive `contains` per non-blank value, to be
 * AND-ed together. Fields are fixed by each caller (never taken from input).
 */
export function columnFilters(
  pairs: [field: string, value: string | undefined][],
): Record<string, ReturnType<typeof ilike>>[] {
  return pairs
    .map(([field, value]) => [field, value?.trim()] as const)
    .filter((p): p is readonly [string, string] => !!p[1])
    .map(([field, value]) => ({ [field]: ilike(value) }));
}

/**
 * Stable `orderBy` for an allow-listed sort column: the chosen column (default
 * `name asc`) then `id` so offset pages never repeat or skip rows on ties.
 */
export function sortOrder(
  sortBy: string | undefined,
  sortDir: SortDir | undefined,
): Record<string, SortDir>[] {
  return [{ [sortBy ?? 'name']: sortDir ?? 'asc' }, { id: 'asc' }];
}

/**
 * A "patient" is a customer record linked to a kalnostics patient OR registered
 * through the inventory Add Patient form (which always sets `patientType`). The
 * single source of truth for the Patients / Customers split used by the People
 * lists and the parties reports.
 */
export const PATIENT_WHERE: Prisma.InventoryCustomerWhereInput = {
  OR: [{ patientId: { not: null } }, { patientType: { not: null } }],
};

/** Plain (non-patient) customers — the complement of {@link PATIENT_WHERE}. */
export const NON_PATIENT_WHERE: Prisma.InventoryCustomerWhereInput = {
  patientId: null,
  patientType: null,
};
