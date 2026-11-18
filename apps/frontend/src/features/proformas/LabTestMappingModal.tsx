import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Plus, Search, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';
import { getApiErrorMessage } from '@/lib/http';
import {
  useProformaRelations,
  useAddProformaRelation,
  useRemoveProformaRelation,
} from './api';

interface Props {
  proformaId: string;
  proformaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LabTestOption {
  id: string;
  name: string;
}

/**
 * Map a proforma to the tenant's master lab tests (EZHT `proformas/modal_labtest`,
 * a `modal-lg` dialog). A clean two-pane layout — searchable catalogue on the left
 * (click a row to map it), current mappings on the right — instead of a floating
 * combobox, so the list never overlaps or clips inside the dialog. The catalogue is
 * the kalnostics lab-test list proxied through `/integration/lab-tests`, so the ids
 * stored here match a branch lab test's `sourceLabTestId` at order time.
 */
export function LabTestMappingModal({
  proformaId,
  proformaName,
  open,
  onOpenChange,
}: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Light debounce so typing doesn't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const catalogue = useInfiniteList<LabTestOption>(
    ['integration-lab-tests'],
    '/integration/lab-tests',
    { search, enabled: open, silent: true },
  );
  const relations = useProformaRelations(proformaId, 'lab_test');
  const addRel = useAddProformaRelation(proformaId);
  const removeRel = useRemoveProformaRelation(proformaId);

  const mappedIds = useMemo(
    () => new Set((relations.data ?? []).map((r) => r.entityId)),
    [relations.data],
  );

  const onAdd = async (opt: LabTestOption) => {
    setPendingId(opt.id);
    try {
      await addRel.mutateAsync({
        entityType: 'lab_test',
        entityId: opt.id,
        label: opt.name,
      });
      toast.success(`${opt.name} mapped`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not map lab test'));
    } finally {
      setPendingId(null);
    }
  };

  const onRemove = async (relationId: string) => {
    try {
      await removeRel.mutateAsync(relationId);
      toast.success('Mapping removed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not remove mapping'));
    }
  };

  const mapped = relations.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{proformaName} — Add Lab Test</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Link this proforma to the lab tests it supplies. When a mapped lab test
          is ordered at a mapped branch, its products are deducted from stock.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ── Left: searchable catalogue ── */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-sm font-medium">Lab test catalogue</div>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search lab tests…"
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="h-72 overflow-y-auto rounded-md border">
              {catalogue.isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : catalogue.rows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No lab tests found.
                </div>
              ) : (
                <ul className="divide-y">
                  {catalogue.rows.map((opt) => {
                    const isMapped = mappedIds.has(opt.id);
                    const isPending = pendingId === opt.id;
                    return (
                      <li
                        key={opt.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent/50"
                      >
                        <span className="truncate">{opt.name}</span>
                        {isMapped ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                            <Check className="h-3.5 w-3.5" /> Added
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 shrink-0 px-2"
                            disabled={isPending}
                            onClick={() => onAdd(opt)}
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Add
                          </Button>
                        )}
                      </li>
                    );
                  })}
                  {catalogue.hasMore && (
                    <li className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={catalogue.isFetchingMore}
                        onClick={() => catalogue.fetchMore()}
                      >
                        {catalogue.isFetchingMore ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Load more'
                        )}
                      </Button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* ── Right: current mappings ── */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-sm font-medium">
              Mapped lab tests{mapped.length ? ` (${mapped.length})` : ''}
            </div>
            <div className="h-72 overflow-y-auto rounded-md border">
              {relations.isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : mapped.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No lab tests mapped yet.
                </div>
              ) : (
                <ul className="divide-y">
                  {mapped.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{r.label ?? r.entityId}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onRemove(r.id)}
                        disabled={removeRel.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
