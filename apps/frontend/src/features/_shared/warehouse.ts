/**
 * Warehouse (branch) summary attached to purchase/sale detail responses by the
 * backend `getDetail` enrichment. Shared by the purchase and sale detail types so
 * both modals render the same "Warehouse" block.
 */
export interface WarehouseDetail {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  gstNumber: string | null;
}
