import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBranchOptions } from '@/features/_shared/branches';
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

/**
 * Assign a proforma to one or more branches (EZHT `proformas/modal_branch`, a
 * `modal-lg` dialog). A proforma consumes inventory for a mapped lab test ONLY at
 * a branch it is assigned to here (requirement #13), so the order's active branch
 * must appear in this list for deduction to happen. Two-pane layout mirrors the
 * Lab Test dialog: available branches on the left (click to assign), assigned
 * branches on the right.
 */
export function BranchMappingModal({
  proformaId,
  proformaName,
  open,
  onOpenChange,
}: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const branches = useBranchOptions();
  const relations = useProformaRelations(proformaId, 'branch');
  const addRel = useAddProformaRelation(proformaId);
  const removeRel = useRemoveProformaRelation(proformaId);

  const assignedIds = useMemo(
    () => new Set((relations.data ?? []).map((r) => r.entityId)),
    [relations.data],
  );

  const onAdd = async (branch: { id: string; name: string }) => {
    setPendingId(branch.id);
    try {
      await addRel.mutateAsync({
        entityType: 'branch',
        entityId: branch.id,
        label: branch.name,
      });
      toast.success(`${branch.name} assigned`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not assign branch'));
    } finally {
      setPendingId(null);
    }
  };

  const onRemove = async (relationId: string) => {
    try {
      await removeRel.mutateAsync(relationId);
      toast.success('Branch removed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not remove branch'));
    }
  };

  const assigned = relations.data ?? [];
  const options = branches.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{proformaName} — Add Branch</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Assign this proforma to the branches where its lab tests should deduct
          inventory. Deduction only happens at an assigned branch.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ── Left: available branches ── */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-sm font-medium">Branches</div>
            <div className="h-72 overflow-y-auto rounded-md border">
              {branches.isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : options.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No branches found.
                </div>
              ) : (
                <ul className="divide-y">
                  {options.map((b) => {
                    const isAssigned = assignedIds.has(b.id);
                    const isPending = pendingId === b.id;
                    return (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent/50"
                      >
                        <span className="truncate">{b.name}</span>
                        {isAssigned ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                            <Check className="h-3.5 w-3.5" /> Assigned
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 shrink-0 px-2"
                            disabled={isPending}
                            onClick={() => onAdd(b)}
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
                </ul>
              )}
            </div>
          </div>

          {/* ── Right: assigned branches ── */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-sm font-medium">
              Assigned branches{assigned.length ? ` (${assigned.length})` : ''}
            </div>
            <div className="h-72 overflow-y-auto rounded-md border">
              {relations.isLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : assigned.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Not assigned to any branch yet.
                </div>
              ) : (
                <ul className="divide-y">
                  {assigned.map((r) => (
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
