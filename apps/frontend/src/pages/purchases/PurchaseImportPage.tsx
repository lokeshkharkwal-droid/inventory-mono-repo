import { OrderCsvImport } from '@/features/orders/OrderCsvImport';

/** Create a purchase from a CSV of line items (`/purchases/import`). */
export function PurchaseImportPage() {
  return <OrderCsvImport mode="purchase" />;
}
