import { MaterialsReportView } from '@/features/reports/MaterialsReportView';

/**
 * Tools & Plants — the low-value slice of the materials asset register (net value
 * below the 1,000,000 threshold). Same full view as the Materials report, over
 * the value-filtered `/reports/tools-and-plants` endpoint.
 */
export function ToolsAndPlantsPage() {
  return (
    <MaterialsReportView
      title="Tools & Plants"
      description="Low-value tools & plants asset register (net value below the 1,000,000 threshold)."
      reportKey="tools-and-plants"
      path="/reports/tools-and-plants"
      filename="tools-and-plants"
      emptyMessage="No tools & plants assets found."
      countLabel="Assets"
    />
  );
}
