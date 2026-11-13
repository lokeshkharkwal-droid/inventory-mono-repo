import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';

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
  /** Show the client-side quick-search box (default true). */
  searchable?: boolean;
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
  searchable = true,
}: ReportTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

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

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this table…"
            className="pl-9"
          />
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
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : view.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {rows.length === 0 ? emptyMessage : 'No rows match your search.'}
                </TableCell>
              </TableRow>
            ) : (
              view.map((row, i) => (
                <TableRow key={rowKey(row, i)}>
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
    </div>
  );
}
