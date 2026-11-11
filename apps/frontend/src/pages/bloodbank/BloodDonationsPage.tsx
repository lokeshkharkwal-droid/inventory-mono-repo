import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfiniteDonations,
  useCreateDonation,
  useDonationStatus,
  useBloodInventory,
  BLOOD_GROUPS,
  BLOOD_COMPONENTS,
  type BloodDonation,
} from '@/features/bloodbank/api';

const STATUSES = ['COLLECTED', 'TESTED', 'AVAILABLE', 'ISSUED', 'DISCARDED'];
const selectCls =
  'flex h-9 rounded-md border border-input bg-background px-2 text-sm';

/** Blood donations (units): inventory summary, list, create, status updates. */
export function BloodDonationsPage() {
  const [open, setOpen] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteDonations();
  const { data: inventory } = useBloodInventory();
  const create = useCreateDonation();
  const status = useDonationStatus();

  const [form, setForm] = useState({
    donorId: '',
    bloodGroup: '',
    component: 'WHOLE_BLOOD',
    bagNumber: '',
    collectedAt: '',
    expiryDate: '',
  });

  const submit = async () => {
    if (!form.donorId || !form.bloodGroup) {
      toast.error('Donor and blood group are required.');
      return;
    }
    try {
      await create.mutateAsync({
        donorId: form.donorId,
        bloodGroup: form.bloodGroup,
        component: form.component,
        bagNumber: form.bagNumber || undefined,
        collectedAt: form.collectedAt || undefined,
        expiryDate: form.expiryDate || undefined,
      });
      toast.success('Donation recorded');
      setOpen(false);
      setForm({ donorId: '', bloodGroup: '', component: 'WHOLE_BLOOD', bagNumber: '', collectedAt: '', expiryDate: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not record donation'));
    }
  };

  const onStatus = async (id: string, value: string) => {
    try {
      await status.mutateAsync({ id, status: value });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update status'));
    }
  };

  const columns: Column<BloodDonation>[] = [
    { key: 'donor', header: 'Donor', render: (r) => r.donor?.name ?? '—' },
    { key: 'bloodGroup', header: 'Group' },
    { key: 'component', header: 'Component' },
    { key: 'bagNumber', header: 'Bag', render: (r) => r.bagNumber ?? '—' },
    {
      key: 'collectedAt',
      header: 'Collected',
      render: (r) => new Date(r.collectedAt).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <select
          className={selectCls}
          value={r.status}
          onChange={(e) => onStatus(r.id, e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Blood donations</h1>
          <p className="text-sm text-muted-foreground">
            Units collected; mark AVAILABLE to add to inventory.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New donation
        </Button>
      </div>

      {/* Available inventory summary */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          {(inventory ?? []).length === 0 ? (
            <span className="text-sm text-muted-foreground">No available units.</span>
          ) : (
            (inventory ?? []).map((r) => (
              <span
                key={`${r.bloodGroup}-${r.component}`}
                className="rounded-md border px-3 py-1 text-sm"
              >
                <strong>{r.bloodGroup}</strong> {r.component}: {r.units}
              </span>
            ))
          )}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No donations yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New donation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Donor</Label>
              <InfiniteSelect
                value={form.donorId}
                onChange={(id) => setForm({ ...form, donorId: id })}
                queryKey={['blood-donors']}
                path="/blood/donors"
                getOptionValue={(d) => d.id}
                getOptionLabel={(d) => `${d.name} (${d.bloodGroup})`}
                placeholder="Select donor…"
                clearable
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Blood group</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.bloodGroup}
                  onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                >
                  <option value="">—</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Component</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.component}
                  onChange={(e) => setForm({ ...form, component: e.target.value })}
                >
                  {BLOOD_COMPONENTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Bag number</Label>
                <Input value={form.bagNumber} onChange={(e) => setForm({ ...form, bagNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Collected</Label>
                <Input type="date" value={form.collectedAt} onChange={(e) => setForm({ ...form, collectedAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
