import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LottieLoader } from '@/components/LottieLoader';
import { PrintButton } from '@/components/shared/PrintButton';
import { EmailDocumentButton } from '@/components/shared/EmailDocumentButton';
import { getApiErrorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import {
  useInfiniteProformas,
  useDeleteProforma,
  type ProformaListRow,
} from '@/features/proformas/api';
import { ProformaActionsMenu } from '@/features/proformas/ProformaActionsMenu';
import { ProformaDetailModal } from '@/features/proformas/ProformaDetailModal';

/** Wait this long after the last keystroke before searching / filtering. */
const FILTER_DEBOUNCE_MS = 300;

/** kaltros brand gradient (primary action), as on the Add / Edit Proforma page. */
const BRAND_BTN =
  'rounded-md bg-[linear-gradient(90deg,#3b82f6_0%,#6366f1_50%,#8b5cf6_100%)] text-white hover:bg-[linear-gradient(90deg,#2563eb_0%,#4f46e5_50%,#7c3aed_100%)]';

/** Compact kaltros toolbar control (filters). */
const FILTER_CONTROL =
  'h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-xs transition-colors placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30';

/**
 * Turns a shared icon button (Print / Email) into a kaltros action square. The
 * shared components render their `<Button>` as a direct child of this wrapper.
 */
const ICON_SQUARE = [
  'contents [&>button]:h-7 [&>button]:w-7 [&>button]:rounded-lg [&>button]:p-0',
  '[&>button]:bg-blue-50 [&>button]:text-blue-600 [&>button:hover]:bg-blue-100',
  '[&>button:hover]:text-blue-700 [&_svg]:h-3.5 [&_svg]:w-3.5',
].join(' ');

const COLUMNS = 7;

/** `value`, but only after it has stopped changing for `ms`. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** The [start, end) ISO instants of a local calendar day (`YYYY-MM-DD`). */
function localDayBounds(day: string): { dateFrom: string; dateTo: string } {
  const [y, m, d] = day.split('-').map(Number);
  const start = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

/**
 * Proformas list — EZ Health Track `proformas` (List Proforma) parity, styled in
 * the kaltros design language: search (name / reference) plus Date, Name and
 * Status filters (all server-side), a table of Date, Name, Reference, Branch
 * Relations, Status, Grand Total and the row actions (legacy Actions menu,
 * print, email, delete). Rows load in batches as the table scrolls.
 */
export function ProformasPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toDelete, setToDelete] = useState<ProformaListRow | null>(null);
  /** The proforma whose details modal is open (row click). */
  const [viewing, setViewing] = useState<ProformaListRow | null>(null);

  const debouncedSearch = useDebounced(search, FILTER_DEBOUNCE_MS);
  const debouncedName = useDebounced(nameFilter.trim(), FILTER_DEBOUNCE_MS);
  const extra = useMemo(
    () => ({
      name: debouncedName || undefined,
      status: statusFilter || undefined,
      ...(dateFilter ? localDayBounds(dateFilter) : {}),
    }),
    [debouncedName, statusFilter, dateFilter],
  );

  const { rows, total, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteProformas({ search: debouncedSearch, extra });
  const del = useDeleteProforma();

  const filtered = Boolean(
    search.trim() || nameFilter.trim() || dateFilter || statusFilter,
  );
  const clearFilters = () => {
    setSearch('');
    setNameFilter('');
    setDateFilter('');
    setStatusFilter('');
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success('Proforma deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete proforma'));
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
          aria-hidden="true"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-gray-800">Proformas</h1>
          <p className="text-xs text-gray-500">
            Use the table below to navigate or filter the results.
          </p>
        </div>
        <Button
          size="sm"
          className={BRAND_BTN}
          onClick={() => navigate('/proformas/add')}
        >
          <Plus className="h-4 w-4" /> Add Proforma
        </Button>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <label className="flex h-8 min-w-0 flex-1 basis-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/30 lg:max-w-sm lg:basis-56">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Search name or reference…"
            aria-label="Search proformas by name or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <input
            type="date"
            className={cn(
              FILTER_CONTROL,
              'min-w-[120px] flex-1 sm:w-[150px] sm:flex-none',
            )}
            aria-label="Filter by date"
            title="Date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <input
            className={cn(
              FILTER_CONTROL,
              'min-w-[120px] flex-1 sm:w-[150px] sm:flex-none',
            )}
            placeholder="Name"
            aria-label="Filter by name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <select
            className={cn(
              FILTER_CONTROL,
              'min-w-[120px] flex-1 sm:w-[130px] sm:flex-none',
            )}
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {filtered && (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-xs">
            <thead>
              <tr className="bg-blue-50">
                <Th>Date</Th>
                <Th>Name</Th>
                <Th>Reference</Th>
                <Th>Branch Relations</Th>
                <Th>Status</Th>
                <Th className="text-right">Grand Total</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMNS} className="py-6">
                    <LottieLoader size={64} className="py-0" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    {filtered
                      ? 'No proformas match these filters.'
                      : 'No proformas yet.'}
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r) => (
                    <ProformaRow
                      key={r.id}
                      row={r}
                      onOpen={() => setViewing(r)}
                      onDelete={() => setToDelete(r)}
                    />
                  ))}
                  <LoadMoreRow
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
            {total === 1 ? 'proforma' : 'proformas'}
          </span>
          {isFetchingMore && (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
            </span>
          )}
        </div>
      </div>

      {/* ── Proforma details (row click) ── */}
      <ProformaDetailModal
        proformaId={viewing?.id ?? ''}
        proformaName={viewing?.name || viewing?.reference || ''}
        open={viewing !== null}
        onOpenChange={(o) => !o && setViewing(null)}
      />

      {/* ── Delete confirmation ── */}
      <Dialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && !del.isPending && setToDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete proforma</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete proforma{' '}
            <span className="font-semibold text-slate-800">
              {toDelete?.name || toDelete?.reference}
            </span>
            {toDelete?.name ? ` (${toDelete.reference})` : ''}? It will be
            removed from this list.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => setToDelete(null)}
              disabled={del.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-md"
              loading={del.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Clicks on these (the row's actions) do their own thing, not open the row. */
const ROW_CONTROLS =
  'button, a, input, select, textarea, label, [role="menu"], [role="menuitem"]';

/**
 * One proforma row. Clicking it (or Enter / Space when focused) opens the
 * proforma's details, like the legacy `proforma_link` rows; its action controls
 * keep their own behaviour.
 */
function ProformaRow({
  row,
  onOpen,
  onDelete,
}: {
  row: ProformaListRow;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const branches = (row.relations ?? []).filter((b) => b.label);

  const onClick = (e: MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as Element;
    // Portalled content (the Actions menu, Email / mapping dialogs) is a React
    // child of the row, so its clicks bubble here too — ignore anything that
    // isn't physically inside the row, and the row's own controls.
    if (!e.currentTarget.contains(target) || target.closest(ROW_CONTROLS))
      return;
    onOpen();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <tr
      tabIndex={0}
      title="View proforma details"
      aria-label={`View details of proforma ${row.name || row.reference}`}
      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60 focus-visible:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/40"
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">
        {new Date(row.date).toLocaleDateString()}
      </td>
      <td className="px-3 py-2.5 font-medium text-slate-800">
        {row.name || <span className="text-slate-400">—</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-500">
        {row.reference}
      </td>
      <td className="px-3 py-2.5">
        {branches.length ? (
          <div className="flex max-w-[260px] flex-wrap gap-1">
            {branches.map((b) => (
              <span
                key={b.id}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {b.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <StatusPill status={row.status} />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">
        {Number(row.grandTotal).toFixed(2)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <ProformaActionsMenu proforma={row} />
          <span className={ICON_SQUARE}>
            <PrintButton
              path={`/print/proforma/${row.id}`}
              title="Print proforma"
              size="icon"
            />
          </span>
          <span className={ICON_SQUARE}>
            <EmailDocumentButton
              type="proforma"
              id={row.id}
              title="Email proforma"
            />
          </span>
          <button
            type="button"
            title="Delete proforma"
            aria-label={`Delete proforma ${row.reference}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/** kaltros status pill — Active green, Inactive red, legacy states amber. */
function StatusPill({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const tone =
    s === 'ACTIVE'
      ? 'bg-green-100 text-green-700'
      : s === 'INACTIVE'
        ? 'bg-red-100 text-red-700'
        : 'bg-yellow-100 text-yellow-700';
  const label = s ? s.charAt(0) + s.slice(1).toLowerCase() : '—';
  return (
    <span
      className={cn(
        'inline-block rounded px-2 py-0.5 text-[10px] font-semibold',
        tone,
      )}
    >
      {label}
    </span>
  );
}

/** Table header cell (kaltros: blue-50 row, semibold slate text). */
function Th({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-left font-semibold text-slate-700',
        className,
      )}
    >
      {children}
    </th>
  );
}

/**
 * Infinite-scroll sentinel row: loads the next batch as it nears the viewport
 * (same pattern as the shared DataTable's sentinel).
 */
function LoadMoreRow({
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
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
        if (entries[0]?.isIntersecting && !isFetchingMore)
          loadMoreRef.current();
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore]);

  if (!hasMore && !isFetchingMore) return null;
  return (
    <tr ref={ref} aria-hidden>
      <td colSpan={COLUMNS} className="py-3 text-center text-slate-400">
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
