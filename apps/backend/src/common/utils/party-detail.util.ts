import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';

/** Warehouse (branch) summary shown in purchase/sale detail modals. */
export interface WarehouseDetail {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  gstNumber: string | null;
}

/** Read a string field off a loosely-typed branch record, else `null`. */
function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * Best-effort warehouse (branch) lookup for the detail modal — resolves the
 * location name/code/address/GST via the kalnostics integration. Returns `null`
 * if the branch is unknown or the integration is unreachable, so the modal still
 * loads (the barcode/line data does not depend on it).
 */
export async function resolveWarehouseDetail(
  branchClient: KalnosticsBranchClient,
  branchId: string | null,
): Promise<WarehouseDetail | null> {
  if (!branchId) return null;
  try {
    const b = await branchClient.findById(branchId);
    return {
      id: b.id,
      name: b.name,
      code: b.code ?? null,
      address: str(b.address),
      gstNumber: str(b.gstNumber) ?? str(b.gstNo),
    };
  } catch {
    return null;
  }
}

/**
 * Batch-resolve many branch ids to their names in one pass (deduped), best-effort.
 * Used by list endpoints (purchases/transfers/adjustments/batches) that show a
 * Warehouse column but store only `branchId`. Unknown/unreachable ids map to null
 * so the list still renders. Mirrors the inline pattern in {@link QuoteService}.
 */
export async function resolveWarehouseNameMap(
  branchClient: KalnosticsBranchClient,
  branchIds: (string | null | undefined)[],
): Promise<Map<string, string | null>> {
  const ids = [...new Set(branchIds.filter((b): b is string => !!b))];
  const entries = await Promise.all(
    ids.map(
      async (id) =>
        [
          id,
          (await resolveWarehouseDetail(branchClient, id))?.name ?? null,
        ] as const,
    ),
  );
  return new Map(entries);
}

/**
 * Best-effort staff-name lookup for a `createdBy` person id (inventory stores the
 * UUID only; names live on the kalnostics auth layer — mirrors the reports
 * "Created By" resolver). Returns `null` when unset/unknown/unreachable.
 */
export async function resolveUserName(
  usersClient: KalnosticsUsersClient,
  personId: string | null,
): Promise<string | null> {
  if (!personId) return null;
  try {
    const { data } = await usersClient.getOptions({ limit: 200 });
    return data.find((u) => u.id === personId)?.name ?? null;
  } catch {
    return null;
  }
}
