import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useBloodRequests,
  useCreateBloodRequest,
  useBloodRequestStatus,
  BLOOD_GROUPS,
  BLOOD_COMPONENTS,
  type BloodRequest,
} from '@/features/bloodbank/api';
import { CrossMatchDialog } from '@/features/bloodbank/CrossMatchDialog';

const LIMIT = 20;
const STATUSES = ['PENDING', 'FULFILLED', 'CANCELLED'];
const selectCls = 'flex h-9 rounded-md border border-input bg-background px-2 text-sm';

/** Blood requests (transfusion orders): list, create, status updates. */
export function BloodRequestsPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useBloodRequests({ page, limit: LIMIT });
  const create = useCreateBloodRequest();
  const status = useBloodRequestStatus();
  const [crossMatch, setCrossMatch] = useState<BloodRequest | null>(null);

  const [form, setForm] = useState({
    bloodGroup: '',
    component: 'WHOLE_BLOOD',
    units: '1',
    patientName: '',
  });

  const submit = async () => {
    if (!form.bloodGroup) {
      toast.error('Blood group is required.');
      return;
    }
    try {
      await create.mutateAsync({
        bloodGroup: form.bloodGroup,
        component: form.component,
        units: Number(form.units || 1),
        patientName: form.patientName || undefined,
      });
      toast.success('Request created');
      setOpen(false);
      setForm({ bloodGroup: '', component: 'WHOLE_BLOOD', units: '1', patientName: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create request'));
    }
  };

  const onStatus = async (id: string, value: string) => {
    try {
      await status.mutateAsync({ id, status: value });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update status'));
    }
  };

  const columns: Column<BloodRequest>[] = [
    { key: 'patientName', header: 'Patient', render: (r) => r.patientName ?? '—' },
    { key: 'bloodGroup', header: 'Group' },
    { key: 'component', header: 'Component' },
    { key: 'units', header: 'Units' },
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
    {
      key: 'actions',
      header: '',
      className: 'text-right w-px whitespace-nowrap',
      render: (r) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCrossMatch(r)}
          title="Cross-match"
        >
          <FlaskConical className="h-4 w-4" /> Cross-match
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Blood requests</h1>
          <p className="text-sm text-muted-foreground">Transfusion requests.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New request
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No requests yet."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New blood request</DialogTitle>
          </DialogHeader>
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
              <Label>Units</Label>
              <Input type="number" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Patient name</Label>
              <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
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

      <CrossMatchDialog
        request={crossMatch}
        onOpenChange={(o) => !o && setCrossMatch(null)}
      />
    </div>
  );
}
