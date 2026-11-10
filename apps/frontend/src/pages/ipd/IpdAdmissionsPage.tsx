import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, LogOut, Trash2, Receipt } from 'lucide-react';
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
  useAdmissions,
  useAdmit,
  useDischarge,
  useDeleteAdmission,
  type Admission,
} from '@/features/ipd/api';
import { IpdChargesDialog } from '@/features/ipd/IpdChargesDialog';

const LIMIT = 20;

/** IPD admissions: list, admit, discharge. */
export function IpdAdmissionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAdmissions({ page, limit: LIMIT, search });
  const admit = useAdmit();
  const discharge = useDischarge();
  const del = useDeleteAdmission();
  const [charges, setCharges] = useState<Admission | null>(null);

  const [form, setForm] = useState({
    patientName: '',
    admissionNo: '',
    ward: '',
    bed: '',
    referringDoctor: '',
    admittedAt: '',
  });

  const submit = async () => {
    if (!form.patientName) {
      toast.error('Patient name is required.');
      return;
    }
    try {
      await admit.mutateAsync({
        patientName: form.patientName,
        admissionNo: form.admissionNo || undefined,
        ward: form.ward || undefined,
        bed: form.bed || undefined,
        referringDoctor: form.referringDoctor || undefined,
        admittedAt: form.admittedAt || undefined,
      });
      toast.success('Patient admitted');
      setOpen(false);
      setForm({ patientName: '', admissionNo: '', ward: '', bed: '', referringDoctor: '', admittedAt: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not admit'));
    }
  };

  const onDischarge = async (r: Admission) => {
    if (!confirm(`Discharge ${r.patientName}?`)) return;
    try {
      await discharge.mutateAsync(r.id);
      toast.success('Patient discharged');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not discharge'));
    }
  };

  const onDelete = async (r: Admission) => {
    if (!confirm(`Delete admission ${r.admissionNo}?`)) return;
    try {
      await del.mutateAsync(r.id);
      toast.success('Admission deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete'));
    }
  };

  const columns: Column<Admission>[] = [
    { key: 'admissionNo', header: 'Admission #' },
    { key: 'patientName', header: 'Patient' },
    { key: 'ward', header: 'Ward', render: (r) => r.ward ?? '—' },
    { key: 'bed', header: 'Bed', render: (r) => r.bed ?? '—' },
    {
      key: 'admittedAt',
      header: 'Admitted',
      render: (r) => new Date(r.admittedAt).toLocaleDateString(),
    },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCharges(r)}>
            <Receipt className="h-4 w-4" /> Charges
          </Button>
          {r.status === 'ADMITTED' && (
            <Button variant="ghost" size="sm" onClick={() => onDischarge(r)}>
              <LogOut className="h-4 w-4" /> Discharge
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(r)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">IPD admissions</h1>
          <p className="text-sm text-muted-foreground">Inpatient admissions.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Admit patient
        </Button>
      </div>

      <Input
        placeholder="Search by patient or admission #…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No admissions yet."
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admit patient</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patient name</Label>
              <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Admission # (auto if blank)</Label>
              <Input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ward</Label>
              <Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Bed</Label>
              <Input value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Referring doctor</Label>
              <Input value={form.referringDoctor} onChange={(e) => setForm({ ...form, referringDoctor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Admitted at</Label>
              <Input type="date" value={form.admittedAt} onChange={(e) => setForm({ ...form, admittedAt: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={admit.isPending}>
              {admit.isPending ? 'Saving…' : 'Admit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IpdChargesDialog
        admission={charges}
        onOpenChange={(o) => !o && setCharges(null)}
      />
    </div>
  );
}
