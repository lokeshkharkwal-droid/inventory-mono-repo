import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { request, getApiErrorMessage } from '@/lib/http';
import { parseCsv, downloadFile } from '@/lib/csv';

/** Per-row outcome returned by the backend bulk-import pipeline. */
interface ImportRowResult {
  index: number;
  ref: string;
  status: 'created' | 'validated' | 'error';
  error?: string;
}

/** Summary returned by every `/<resource>/import` endpoint. */
export interface ImportSummary {
  total: number;
  created: number;
  validated: number;
  errors: number;
  dryRun: boolean;
  results: ImportRowResult[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Backend import endpoint, e.g. `/customers/import`. */
  endpoint: string;
  /** TanStack Query key to invalidate after a successful commit. */
  invalidateKey: string;
  /** Header line used for the downloadable template (and column help). */
  templateHeader: string;
  /** Map parsed CSV records into the API row shape the endpoint expects. */
  buildRows: (records: Record<string, string>[]) => unknown[];
}

/**
 * Shared CSV import flow (preview → commit) used across products, customers,
 * suppliers, materials, purchases, sales, and transfers. The user picks a CSV,
 * we parse it client-side, preview with `dryRun` (per-row validation), then
 * commit. Mirrors the legacy import preview → commit UX.
 */
export function ImportDialog({
  open,
  onOpenChange,
  title,
  endpoint,
  invalidateKey,
  templateHeader,
  buildRows,
}: ImportDialogProps) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<unknown[]>([]);
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setRows([]);
    setFileName('');
    setSummary(null);
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const records = parseCsv(text);
      const built = buildRows(records);
      setRows(built);
      setFileName(file.name);
      setSummary(null);
      if (built.length === 0) toast.error('No data rows found in the file.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not read the file'));
    }
  };

  const run = async (dryRun: boolean) => {
    if (rows.length === 0) {
      toast.error('Choose a CSV file first.');
      return;
    }
    setBusy(true);
    try {
      const res = await request<ImportSummary>('POST', endpoint, {
        body: { dryRun, rows },
      });
      setSummary(res);
      if (!dryRun) {
        toast.success(`Imported ${res.created} of ${res.total} rows`);
        qc.invalidateQueries({ queryKey: [invalidateKey] });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Import failed'));
    } finally {
      setBusy(false);
    }
  };

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Columns: <code className="text-xs">{templateHeader}</code>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadFile('import-template.csv', `${templateHeader}\n`)
              }
            >
              <Download className="h-4 w-4" /> Template
            </Button>
          </div>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />
          {fileName && (
            <p className="text-sm">
              {fileName} — <strong>{rows.length}</strong> row(s) parsed
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => run(true)}
              disabled={busy || rows.length === 0}
            >
              Preview
            </Button>
            <Button
              onClick={() => run(false)}
              disabled={busy || rows.length === 0}
            >
              <Upload className="h-4 w-4" /> Import
            </Button>
          </div>

          {summary && (
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <span>Total: {summary.total}</span>
                {summary.dryRun ? (
                  <span className="text-green-600">
                    Valid: {summary.validated}
                  </span>
                ) : (
                  <span className="text-green-600">
                    Created: {summary.created}
                  </span>
                )}
                <span className="text-destructive">
                  Errors: {summary.errors}
                </span>
                {summary.dryRun && (
                  <span className="text-muted-foreground">(preview)</span>
                )}
              </div>
              {summary.errors > 0 && (
                <div className="max-h-48 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-3 py-1.5">Row</th>
                        <th className="px-3 py-1.5">Ref</th>
                        <th className="px-3 py-1.5">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.results
                        .filter((r) => r.status === 'error')
                        .map((r) => (
                          <tr key={r.index} className="border-b last:border-0">
                            <td className="px-3 py-1.5">{r.index + 1}</td>
                            <td className="px-3 py-1.5">{r.ref}</td>
                            <td className="px-3 py-1.5 text-destructive">
                              {r.error}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
