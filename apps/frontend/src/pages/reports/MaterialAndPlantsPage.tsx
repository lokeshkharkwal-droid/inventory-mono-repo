import { MaterialsReportView } from '@/features/reports/MaterialsReportView';

/**
 * Material & Plants — the high-value slice of the materials asset register (net
 * value ≥ 1,000,000), complementing Tools & Plants. Same full view as the
 * Materials report, over the value-filtered `/reports/material-and-plants`
 * endpoint.
 */
export function MaterialAndPlantsPage() {
  return (
    <MaterialsReportView
      title="Material & Plants"
      description="High-value materials & plant assets (net value at or above the 1,000,000 threshold) with current stock value."
      reportKey="material-and-plants"
      path="/reports/material-and-plants"
      filename="material-and-plants"
      emptyMessage="No high-value materials found."
      countLabel="Assets"
    />
  );
}
