import { MaterialsReportView } from '@/features/reports/MaterialsReportView';

/**
 * Materials Report — the full materials asset register (every recorded material),
 * with repair/damage quantities, derived balance and current stock value
 * (grandTotal = balanceQuantity × unitPrice). Thin wrapper over the shared
 * {@link MaterialsReportView}; Tools & Plants and Material & Plants are the same
 * view over a value-sliced endpoint.
 */
export function MaterialsPage() {
  return (
    <MaterialsReportView
      title="Materials Report"
      description="Every recorded material with repair/damage quantities, derived balance and current stock value."
      reportKey="materials"
      path="/reports/materials"
      filename="materials-report"
      emptyMessage="No materials found."
      countLabel="Materials"
    />
  );
}
