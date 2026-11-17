import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ReportColumn } from '@/features/reports/types';
import { LottieLoader } from '@/components/LottieLoader';
import { cn } from '@/lib/utils';

/** "Show entries" options (legacy DataTables `aLengthMenu`). -1 = All. */
const PAGE_SIZES: { value: number; label: string }[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: -1, label: 'All' },
];

/** Parse a cell value as a number (handles "1,550.00", "36.10%", "-12"); null if not numeric. */
function asNumber(v: string | number): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = v.trim();
  if (!/^-?[\d,]+(\.\d+)?%?$/.test(s)) return null;
  const n = Number(s.replace(/[,%]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Parse a cell value as a date (locale date/datetime string); null if not a date. */
function asDate(v: string | number): number | null {
  if (typeof v !== 'string' || !/\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(v)) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Optional footer totals row — one cell per column (ReactNode or ''). */
  totalsRow?: ReactNode[];
  /**
   * Show the client-side quick-search box. Defaults to true, except in
   * server-pagination mode where it defaults to false (the page's dedicated
   * filters search server-side, so a page-local quick-search would mislead).
   */
  searchable?: boolean;
  /**
   * Show the legacy "Show [N] entries" page-size selector (10/25/50/100/All) and
   * paginate the filtered+sorted rows client-side. Default off (renders all rows).
   */
  showEntries?: boolean;
  /** Default page size when `showEntries` is on (default 25). */
  defaultPageSize?: number;
  /**
   * Server-side pagination mode. When set, `rows` is treated as the current
   * server page (rendered as-is, never sliced); the "Show [N] entries" selector
   * and the Showing/Prev/Next footer are driven by these values + callbacks.
   * Mutually exclusive with the client-side `showEntries` paging.
   */
  serverPagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  /**
   * When set, each data row becomes clickable (cursor + hover) and invokes this
   * with the row. Mirrors the legacy reports' clickable invoice rows (e.g. the
   * GST report opening an invoice detail modal).
   */
  onRowClick?: (row: T) => void;
}

/**
 * Report data table driven by `ReportColumn[]`, with legacy-DataTables-style
 * ergonomics: a global quick-search box and click-to-sort column headers
 * (numeric-aware, using each column's `value` accessor), plus a sticky totals
 * footer. Search + sort are client-side over the already-loaded rows; the
 * totals footer always reflects the full (unfiltered) result set from the API.
 */
export function ReportTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyMessage = 'No records found.',
  totalsRow,
  searchable,
  showEntries = false,
  defaultPageSize = 25,
  onRowClick,
  serverPagination,
}: ReportTableProps<T>) {
  const serverMode = !!serverPagination;
  // Quick-search defaults on, but off in server mode (dedicated filters search server-side).
  const showSearch = searchable ?? !serverMode;
  // The "Show N entries" selector shows for client paging OR server mode.
  const showLenMenu = showEntries || serverMode;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [page, setPage] = useState(1);

  const alignCls = (c: ReportColumn<T>) =>
    cn(c.align === 'right' && 'text-right tabular-nums', c.className);

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === 'asc'
          ? { key, dir: 'desc' }
          : null
        : { key, dir: 'asc' },
    );

  const view = useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        columns.some((c) => String(c.value(r)).toLowerCase().includes(q)),
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const dir = sort.dir === 'asc' ? 1 : -1;
        out = [...out].sort((a, b) => {
          const va = col.value(a);
          const vb = col.value(b);
          // Numeric sort when both cells are numbers or numeric-looking strings
          // (money/qty cells render formatted like "1,550.00" / "36.10%").
          const na = asNumber(va);
          const nb = asNumber(vb);
          if (na !== null && nb !== null) return (na - nb) * dir;
          // Date sort when both cells parse as dates (but aren't plain numbers).
          const da = asDate(va);
          const db = asDate(vb);
          if (da !== null && db !== null) return (da - db) * dir;
          return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
        });
      }
    }
    return out;
  }, [rows, columns, query, sort]);

  // Pagination. In server mode the caller owns page/size/total and `rows` is the
  // current page (never sliced here); otherwise paginate the filtered rows client-side.
  const effectivePageSize = serverMode ? serverPagination!.pageSize : pageSize;
  const total = serverMode ? serverPagination!.total : view.length;
  const allEntries = effectivePageSize === -1;
  const size = allEntries ? total || 1 : effectivePageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = serverMode
    ? serverPagination!.page
    : Math.min(page, pageCount);
  const paged = serverMode
    ? view
    : showEntries && !allEntries
      ? view.slice((current - 1) * size, current * size)
      : view;
  const firstRow = total === 0 ? 0 : (current - 1) * size + 1;
  const lastRow = allEntries ? total : Math.min(current * size, total);

  const changePageSize = (s: number) =>
    serverMode ? serverPagination!.onPageSizeChange(s) : setPageSize(s);
  const goToPage = (p: number) =>
    serverMode ? serverPagination!.onPageChange(p) : setPage(p);

  // Reset to the first page whenever the result set or page size changes.
  useEffect(() => {
    setPage(1);
  }, [query, sort, pageSize, rows]);

  return (
    <div className="space-y-3">
      {(showSearch || showLenMenu) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showLenMenu ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Show
              <Select
                value={String(effectivePageSize)}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="w-20"
              >
                {PAGE_SIZES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              entries
            </label>
          ) : (
            <span />
          )}
          {showSearch && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this table…"
                className="pl-9"
              />
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <TableHead key={c.key} className={cn('cursor-pointer select-none', alignCls(c))}>
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-foreground',
                        c.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {c.header}
                      {active ? (
                        sort!.dir === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  <div className="py-6">
                    <LottieLoader size={64} className="py-0" />
                  </div>
                </TableCell>
              </TableRow>
            ) : view.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {rows.length === 0 ? emptyMessage : 'No rows match your search.'}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, i) => (
                <TableRow
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={alignCls(c)}>
                      {c.render ? c.render(row) : c.value(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {totalsRow && rows.length > 0 && (
            <TableFooter>
              <TableRow>
                {columns.map((c, i) => (
                  <TableCell key={c.key} className={cn('font-semibold', alignCls(c))}>
                    {totalsRow[i]}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      {showLenMenu && !isLoading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {firstRow}–{lastRow} of {total}
          </span>
          {!allEntries && pageCount > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={current <= 1}
                onClick={() => goToPage(Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="tabular-nums">
                Page {current} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={current >= pageCount}
                onClick={() => goToPage(Math.min(pageCount, current + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
