import type { ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReportColumn } from '@/features/reports/types';
import { exportReportCsv, printReport } from '@/features/reports/print-report';

/** Export config for the built-in CSV + PDF toolbar buttons. */
export interface ReportExportConfig<T> {
  /** Base filename (no extension) e.g. 'sales-report'. */
  filename: string;
  columns: ReportColumn<T>[];
  rows: T[];
  /** Printed sub-title (e.g. the active date range). */
  subtitle?: string;
  /** Key/value chips printed above the table in the PDF. */
  meta?: { label: string; value: string }[];
  /** Totals footer row for the PDF (aligned to columns). */
  totalsRow?: (string | number)[];
}

interface ReportShellProps<T> {
  title: string;
  description?: string;
  /** Filter controls rendered in the toolbar row. */
  filters?: ReactNode;
  /** When set, renders Export CSV + Export PDF buttons wired to this config. */
  exportConfig?: ReportExportConfig<T>;
  /** Extra toolbar actions (rendered next to the export buttons). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Standard shell for every migrated report page: a title/description header, a
 * filter bar, built-in CSV + PDF export (matching the legacy reports' export
 * buttons), and the report body. Pages define their `ReportColumn[]` once and
 * pass it to both this shell (for export) and the `ReportTable` (for display).
 */
export function ReportShell<T>({
  title,
  description,
  filters,
  exportConfig,
  actions,
  children,
}: ReportShellProps<T>) {
  const onCsv = () => {
    if (!exportConfig) return;
    exportReportCsv(exportConfig.filename, exportConfig.columns, exportConfig.rows);
  };
  const onPdf = () => {
    if (!exportConfig) return;
    printReport({
      title,
      subtitle: exportConfig.subtitle,
      meta: exportConfig.meta,
      columns: exportConfig.columns,
      rows: exportConfig.rows,
      totalsRow: exportConfig.totalsRow,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {exportConfig && (
            <>
              <Button variant="outline" size="sm" onClick={onCsv}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={onPdf}>
                <Printer className="h-4 w-4" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {filters && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          {filters}
        </div>
      )}

      {children}
    </div>
  );
}
