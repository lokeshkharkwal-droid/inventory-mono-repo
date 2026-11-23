import { useCallback, useState } from 'react';
import { FileText, FileDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SelectionConfig } from './DataTable';

/**
 * Row-selection state for list pages — pass `selection` to `<DataTable>` and
 * read `selectedIds` for bulk actions.
 */
export function useRowSelection(): {
  selectedIds: Set<string>;
  clear: () => void;
  selection: SelectionConfig;
} {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const onToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const onToggleAll = useCallback((ids: string[], allSelected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((i) => next.delete(i));
      else ids.forEach((i) => next.add(i));
      return next;
    });
  }, []);
  const clear = useCallback(() => setSelectedIds(new Set()), []);
  return { selectedIds, clear, selection: { selectedIds, onToggle, onToggleAll } };
}

/**
 * Bulk-action bar (EZHT list "Actions"): Combine-to-PDF (merged documents) +
 * Export-to-PDF (summary table). Hidden when nothing is selected.
 */
export function BulkPdfBar({
  count,
  onCombine,
  onExport,
  onClear,
}: {
  count: number;
  onCombine: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <span className="font-medium">{count} selected</span>
      <Button variant="outline" size="sm" onClick={onCombine}>
        <FileText className="h-4 w-4" /> Combine to PDF
      </Button>
      <Button variant="outline" size="sm" onClick={onExport}>
        <FileDown className="h-4 w-4" /> Export to PDF
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="h-4 w-4" /> Clear
      </Button>
    </div>
  );
}
