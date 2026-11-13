import { OrderCsvImport } from '@/features/orders/OrderCsvImport';

/** Create a sale from a CSV of line items (`/sales/generate-order-by-csv`). */
export function GenerateOrderByCsvPage() {
  return <OrderCsvImport mode="sale" />;
}
