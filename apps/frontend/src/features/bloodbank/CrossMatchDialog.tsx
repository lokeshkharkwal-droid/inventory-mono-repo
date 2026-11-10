import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/http';
import {
  useDonations,
  useCrossMatches,
  useCreateCrossMatch,
  type BloodRequest,
} from './api';

interface CrossMatchDialogProps {
  request: BloodRequest | null;
  onOpenChange: (open: boolean) => void;
}

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Cross-match a blood request against an available donation unit. The ABO/Rh
 * result is computed automatically by the backend unless an explicit result is
 * chosen; prior cross-matches for the request are listed below the form.
 */
export function CrossMatchDialog({
  request,
  onOpenChange,
}: CrossMatchDialogProps) {
  const open = !!request;
  const { data: donations } = useDonations({ page: 1, limit: 200 });
  const { data: matches } = useCrossMatches(request?.id ?? null);
  const create = useCreateCrossMatch();

  const [donationId, setDonationId] = useState('');
  const [result, setResult] = useState(''); // '' = auto
  const [note, setNote] = useState('');

  const submit = async () => {
    if (!request) return;
    if (!donationId) {
      toast.error('Select a donation unit.');
      return;
    }
    try {
      const res = await create.mutateAsync({
        requestId: request.id,
        donationId,
        result: result || undefined,
        note: note || undefined,
      });
      toast.success(
        res.result === 'COMPATIBLE'
          ? 'Cross-match: COMPATIBLE'
          : `Cross-match: ${res.result}`,
      );
      setDonationId('');
      setResult('');
      setNote('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not cross-match'));
    }
  };

  // Units eligible to cross-match (available for issue).
  const units = (donations?.data ?? []).filter(
    (d) => d.status === 'AVAILABLE' || d.status === 'COLLECTED',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Cross-match — {request?.patientName ?? 'request'} ({request?.bloodGroup})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Donation unit</Label>
            <select
              className={selectCls}
              value={donationId}
              onChange={(e) => setDonationId(e.target.value)}
            >
              <option value="">—</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.bagNumber ?? u.id.slice(0, 8)} · {u.bloodGroup} · {u.component}
                </option>
              ))}
            </select>
            {units.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No available units to cross-match.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Result</Label>
            <select
              className={selectCls}
              value={result}
              onChange={(e) => setResult(e.target.value)}
            >
              <option value="">Auto (ABO/Rh rules)</option>
              <option value="COMPATIBLE">Compatible (manual)</option>
              <option value="INCOMPATIBLE">Incompatible (manual)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Running…' : 'Run cross-match'}
            </Button>
          </div>

          <div className="border-t pt-3">
            <p className="mb-2 text-sm font-medium">Previous cross-matches</p>
            <div className="space-y-1">
              {(matches?.data ?? []).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Date(m.date).toLocaleString()}
                    {m.isAutoResult ? ' · auto' : ' · manual'}
                  </span>
                  <span
                    className={
                      m.result === 'COMPATIBLE'
                        ? 'font-medium text-green-600'
                        : 'font-medium text-destructive'
                    }
                  >
                    {m.result}
                  </span>
                </div>
              ))}
              {(matches?.data ?? []).length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  No cross-matches yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
