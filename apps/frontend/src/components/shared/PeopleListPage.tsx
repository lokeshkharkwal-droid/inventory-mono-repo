import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LottieLoader } from '@/components/LottieLoader';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { BRAND_BTN } from '@/components/shared/PartyFormCard';
import type {
  InfiniteListParams,
  InfiniteListResult,
} from '@/features/_shared/useInfiniteList';
import { exportReportCsv, printReport } from '@/features/reports/print-report';
import { getApiErrorMessage, requestPaged } from '@/lib/http';
import { cn } from '@/lib/utils';

/** Wait this long after the last keystroke before searching / filtering. */
const FILTER_DEBOUNCE_MS = 300;
/** Backend page-size cap — exports page through the full filtered set. */
const EXPORT_PAGE_SIZE = 100;

/** One column of a People list (drives the cell, sort, filter and exports). */
export interface PeopleColumn<T> {
  key: string;
  header: string;
  /** Plain value — CSV / PDF export and the default cell. */
  value: (row: T) => string | number;
  /** Optional rich on-screen cell. */
  render?: (row: T) => ReactNode;
  /** Backend `sortBy` value; omit for a non-sortable column. */
  sortKey?: string;
  /** Backend column-filter query param; omit for no filter input. */
  filterKey?: string;
  /** `status` renders an All / Active / Inactive select in the filter row. */
  filterType?: 'text' | 'status';
  className?: string;
}

/** Optional CSV import for the list (reuses the shared ImportDialog). */
export interface PeopleImportConfig {
  /** Actions-menu label, e.g. "Add Suppliers by CSV". */
  label: string;
  endpoint: string;
  templateHeader: string;
  buildRows: (records: Record<string, string>[]) => unknown[];
}

/** The subset of `makeCrudHooks` the list consumes. */
interface ListHooks<T> {
  useInfiniteList: (p?: InfiniteListParams) => InfiniteListResult<T>;
  useRemove: () => UseMutationResult<unknown, unknown, string>;
}

interface Props<T extends { id: string }> {
  /** Plural title, e.g. "Suppliers". */
  title: string;
  /** Singular entity, e.g. "Supplier". */
  entity: string;
  icon: LucideIcon;
  /** Route base for Add / Edit, e.g. `/suppliers`. */
  basePath: string;
  /** API list path, e.g. `/suppliers` (used by the full-set export). */
  resource: string;
  /** Query-cache key used by `hooks` (invalidated after import). */
  queryKey: string;
  hooks: ListHooks<T>;
  columns: PeopleColumn<T>[];
  /** Fixed list params (e.g. `{ patient: 'true' }`). */
  listExtra?: Record<string, string>;
  /** Human label for the delete confirmation. */
  rowLabel: (row: T) => string;
  /** Extra per-row actions rendered before Edit / Delete. */
  rowActions?: (row: T) => ReactNode;
  /** Override the row Edit route (defaults to `${basePath}/edit/:id`). */
  editPath?: (row: T) => string;
  importConfig?: PeopleImportConfig;
}

type SortDir = 'asc' | 'desc';

/** `value`, but only after it has stopped changing for `ms`. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * People list screen (Manufacturers, Suppliers, Patients, Customers) — EZ Health
 * Track DataTables parity in the kaltros design language of the Proformas list:
 * an Actions menu (Add, CSV import, Export to Excel / PDF), a global search,
 * per-column filters and sortable headers (all server-side), infinite scroll
 * with a "Showing X of Y" footer, and Edit / Delete row actions with a styled
 * delete confirmation. Exports page through the whole filtered set.
 */
export function PeopleListPage<T extends { id: string }>({
  title,
  entity,
  icon: Icon,
  basePath,
  resource,
  queryKey,
  hooks,
  columns,
  listExtra,
  rowLabel,
  rowActions,
  editPath,
  importConfig,
}: Props<T>) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ by: string; dir: SortDir } | null>(null);
  const [toDelete, setToDelete] = useState<T | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const debouncedSearch = useDebounced(search.trim(), FILTER_DEBOUNCE_MS);
  const debouncedFilters = useDebounced(filters, FILTER_DEBOUNCE_MS);

  const extra = useMemo(() => {
    const out: Record<string, string> = { ...listExtra };
    for (const [k, v] of Object.entries(debouncedFilters)) {
      if (v.trim()) out[k] = v.trim();
    }
    if (sort) {
      out.sortBy = sort.by;
      out.sortDir = sort.dir;
    }
    return out;
  }, [listExtra, debouncedFilters, sort]);

  const { rows, total, isLoading, isError, hasMore, isFetchingMore, fetchMore } =
    hooks.useInfiniteList({ search: debouncedSearch, extra });
  const remove = hooks.useRemove();

  const filtered = Boolean(
    search.trim() || Object.values(filters).some((v) => v.trim()),
  );
  const clearFilters = () => {
    setSearch('');
    setFilters({});
  };
  const setFilter = (key: string, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleSort = (by: string) =>
    setSort((prev) =>
      prev?.by !== by
        ? { by, dir: 'asc' }
        : prev.dir === 'asc'
          ? { by, dir: 'desc' }
          : null,
    );

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success(`${entity} deleted`);
      setToDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Could not delete ${entity.toLowerCase()}`));
    }
  };

  /** Every row matching the current search / filters / sort (all pages). */
  const fetchAllRows = async (): Promise<T[]> => {
    const all: T[] = [];
    for (let page = 1; ; page += 1) {
      const res = await requestPaged<T>('GET', resource, {
        query: {
          page,
          limit: EXPORT_PAGE_SIZE,
          search: debouncedSearch || undefined,
          ...extra,
        },
      });
      all.push(...res.data);
      if (res.meta.page >= res.meta.totalPages || res.data.length === 0) break;
    }
    return all;
  };

  // Exports leave empty cells blank (the on-screen "—" placeholder is display-only).
  const exportColumns = columns.map((c) => ({
    key: c.key,
    header: c.header,
    value: (r: T) => {
      const v = c.value(r);
      return v === '—' ? '' : v;
    },
  }));
  const slug = title.toLowerCase().replace(/\s+/g, '-');

  const runExport = async (kind: 'excel' | 'pdf') => {
    setExporting(kind);
    try {
      const all = await fetchAllRows();
      if (all.length === 0) {
        toast.error('Nothing to export.');
        return;
      }
      if (kind === 'excel') {
        exportReportCsv(slug, exportColumns, all);
      } else if (
        !printReport({
          title,
          subtitle: `${all.length} ${all.length === 1 ? entity.toLowerCase() : title.toLowerCase()}`,
          columns: exportColumns,
          rows: all,
        })
      ) {
        toast.error('Allow pop-ups to export the PDF.');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not export'));
    } finally {
      setExporting(null);
    }
  };

  const colCount = columns.length + 1;
  const hasFilterRow = columns.some((c) => c.filterKey);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-gray-800">{title}</h1>
          <p className="text-xs text-gray-500">
            Use the table below to navigate or filter the results. You can
            download the table as Excel and PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionsMenu
            items={[
              {
                label: `Add ${entity}`,
                icon: PlusCircle,
                onSelect: () => navigate(`${basePath}/add`),
              },
              ...(importConfig
                ? [
                    {
                      label: importConfig.label,
                      icon: Upload,
                      onSelect: () => setImportOpen(true),
                    },
                  ]
                : []),
              {
                label: 'Export to Excel file',
                icon: FileSpreadsheet,
                onSelect: () => void runExport('excel'),
                disabled: exporting !== null,
              },
              {
                label: 'Export to PDF file',
                icon: FileText,
                onSelect: () => void runExport('pdf'),
                disabled: exporting !== null,
              },
            ]}
            busy={exporting !== null}
          />
          <Button
            size="sm"
            className={BRAND_BTN}
            onClick={() => navigate(`${basePath}/add`)}
          >
            <Plus className="h-4 w-4" /> Add {entity}
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30 lg:max-w-sm">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            placeholder={`Search ${title.toLowerCase()}…`}
            aria-label={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {filtered && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-xs">
            <thead>
              <tr className="bg-blue-50">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      sort && c.sortKey && sort.by === c.sortKey
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={cn(
                      'whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-left font-semibold text-slate-700',
                      c.className,
                    )}
                  >
                    {c.sortKey ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-indigo-600"
                        onClick={() => toggleSort(c.sortKey!)}
                        title={`Sort by ${c.header}`}
                      >
                        {c.header}
                        <SortIcon
                          dir={sort?.by === c.sortKey ? sort.dir : undefined}
                        />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
                <th
                  scope="col"
                  className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-right font-semibold text-slate-700"
                >
                  Actions
                </th>
              </tr>
              {hasFilterRow && (
                <tr className="bg-white">
                  {columns.map((c) => (
                    <th key={c.key} className="border-b border-slate-100 px-2 py-1.5 font-normal">
                      {c.filterKey &&
                        (c.filterType === 'status' ? (
                          <select
                            className={FILTER_CONTROL}
                            aria-label={`Filter by ${c.header}`}
                            value={filters[c.filterKey] ?? ''}
                            onChange={(e) => setFilter(c.filterKey!, e.target.value)}
                          >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : (
                          <input
                            className={FILTER_CONTROL}
                            placeholder={`[${c.header}]`}
                            aria-label={`Filter by ${c.header}`}
                            value={filters[c.filterKey] ?? ''}
                            onChange={(e) => setFilter(c.filterKey!, e.target.value)}
                          />
                        ))}
                    </th>
                  ))}
                  <th className="border-b border-slate-100" />
                </tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colCount} className="py-6">
                    <LottieLoader size={64} className="py-0" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-red-500">
                    Could not load {title.toLowerCase()}. Please try again.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-slate-400">
                    {filtered
                      ? `No ${title.toLowerCase()} match these filters.`
                      : `No ${title.toLowerCase()} yet.`}
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn('px-3 py-2.5 text-slate-700', c.className)}
                        >
                          {c.render ? c.render(r) : c.value(r)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {rowActions?.(r)}
                          <RowIconButton
                            title={`Edit ${entity.toLowerCase()}`}
                            label={`Edit ${rowLabel(r)}`}
                            onClick={() =>
                              navigate(editPath ? editPath(r) : `${basePath}/edit/${r.id}`)
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </RowIconButton>
                          <RowIconButton
                            title={`Delete ${entity.toLowerCase()}`}
                            label={`Delete ${rowLabel(r)}`}
                            tone="danger"
                            onClick={() => setToDelete(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </RowIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <LoadMoreRow
                    colSpan={colCount}
                    hasMore={hasMore}
                    isFetchingMore={isFetchingMore}
                    onLoadMore={fetchMore}
                  />
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
          <span>
            Showing {rows.length} of {total}{' '}
            {total === 1 ? entity.toLowerCase() : title.toLowerCase()}
          </span>
          {isFetchingMore && (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
            </span>
          )}
        </div>
      </div>

      {/* ── Delete confirmation ── */}
      <Dialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && !remove.isPending && setToDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete {entity.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete {entity.toLowerCase()}{' '}
            <span className="font-semibold text-slate-800">
              {toDelete ? rowLabel(toDelete) : ''}
            </span>
            ? It will be removed from this list.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => setToDelete(null)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-md"
              loading={remove.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {importConfig && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title={importConfig.label}
          endpoint={importConfig.endpoint}
          invalidateKey={queryKey}
          templateHeader={importConfig.templateHeader}
          buildRows={importConfig.buildRows}
        />
      )}
    </div>
  );
}

/** Compact kaltros filter control (column-filter row). */
const FILTER_CONTROL =
  'h-7 w-full min-w-[80px] rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30';

/** kaltros status pill — Active green, Inactive red. */
export function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-block rounded px-2 py-0.5 text-[10px] font-semibold',
        active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/** A 28px kaltros row-action square (blue by default, red for danger). */
export function RowIconButton({
  title,
  label,
  tone = 'default',
  onClick,
  children,
}: {
  title: string;
  label: string;
  tone?: 'default' | 'danger';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2',
        tone === 'danger'
          ? 'bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-500/30'
          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 focus-visible:ring-indigo-500/30',
      )}
    >
      {children}
    </button>
  );
}

function SortIcon({ dir }: { dir?: SortDir }) {
  if (dir === 'asc') return <ArrowUp className="h-3 w-3 text-indigo-600" />;
  if (dir === 'desc') return <ArrowDown className="h-3 w-3 text-indigo-600" />;
  return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
}

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
}

/** The legacy list "Actions" menu (Add / Import / Export to Excel / PDF). */
function ActionsMenu({ items, busy }: { items: MenuItem[]; busy?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-md border-gray-200 text-gray-700 hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Actions <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <item.icon className="h-3.5 w-3.5 text-slate-500" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Infinite-scroll sentinel row (same pattern as the shared DataTable). */
function LoadMoreRow({
  colSpan,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
  colSpan: number;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLTableRowElement | null>(null);
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingMore) loadMoreRef.current();
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore]);

  if (!hasMore && !isFetchingMore) return null;
  return (
    <tr ref={ref} aria-hidden>
      <td colSpan={colSpan} className="py-3 text-center text-slate-400">
        {isFetchingMore ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
          </span>
        ) : (
          'Scroll to load more'
        )}
      </td>
    </tr>
  );
}
