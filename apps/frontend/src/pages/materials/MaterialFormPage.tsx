import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useMaterial,
  useCreateMaterial,
  useUpdateMaterial,
} from '@/features/materials/api';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { useBranchOptions } from '@/features/_shared/branches';
import { getApiErrorMessage } from '@/lib/http';
import '@/styles/ezht-form.css';

interface FormShape {
  entryDate: string;
  purchaseOrderNo: string;
  department: string;
  departmentRoom: string;
  name: string; // product name
  category: string; // product category
  sellerName: string;
  quantity: string;
  purchaseDate: string;
  installationDate: string;
  materialStatus: string;
  cost: string; // unit price
  grandTotal: string;
  amcCost: string;
  cmcCost: string;
  estimatedPresentCost: string;
  codalLife: string;
  amcStatus: string;
  amcStartDate: string;
  amcEndDate: string;
  issueTo: string;
  transferTo: string;
  documentUrl: string;
  note: string; // material note
  staffNote: string;
}

const EMPTY: FormShape = {
  entryDate: '',
  purchaseOrderNo: '',
  department: '',
  departmentRoom: '',
  name: '',
  category: '',
  sellerName: '',
  quantity: '',
  purchaseDate: '',
  installationDate: '',
  materialStatus: 'pending',
  cost: '',
  grandTotal: '',
  amcCost: '',
  cmcCost: '',
  estimatedPresentCost: '',
  codalLife: '',
  amcStatus: 'pending',
  amcStartDate: '',
  amcEndDate: '',
  issueTo: '',
  transferTo: '',
  documentUrl: '',
  note: '',
  staffNote: '',
};

const num = (v: string) => (v === '' ? undefined : Number(v));

/**
 * Add / Edit Material — faithful port of the EZ Health Track "Add Material" asset
 * register: the full three-column field grid with Biller + Warehouse dropdowns,
 * Material Status (completed/pending) and AMC Status (pending/due/expired/active)
 * dropdowns, purchase/installation/AMC dates, costs, and the material/staff notes.
 */
export function MaterialFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = useMaterial(id);
  const create = useCreateMaterial();
  const update = useUpdateMaterial();
  const { data: branches } = useBranchOptions();
  const warehouses = useMemo(() => branches ?? [], [branches]);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormShape>({
    defaultValues: EMPTY,
  });
  const [billerId, setBillerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const m = one.data;
    reset({
      entryDate: day(m.entryDate),
      purchaseOrderNo: m.purchaseOrderNo ?? '',
      department: m.department ?? '',
      departmentRoom: m.departmentRoom ?? '',
      name: m.name,
      category: m.category ?? '',
      sellerName: m.sellerName ?? '',
      quantity: String(m.quantity ?? ''),
      purchaseDate: day(m.purchaseDate),
      installationDate: day(m.installationDate),
      materialStatus: m.materialStatus ?? 'pending',
      cost: m.cost != null ? String(m.cost) : '',
      grandTotal: m.grandTotal != null ? String(m.grandTotal) : '',
      amcCost: m.amcCost != null ? String(m.amcCost) : '',
      cmcCost: m.cmcCost != null ? String(m.cmcCost) : '',
      estimatedPresentCost:
        m.estimatedPresentCost != null ? String(m.estimatedPresentCost) : '',
      codalLife: m.codalLife ?? '',
      amcStatus: m.amcStatus ?? 'pending',
      amcStartDate: day(m.amcStartDate),
      amcEndDate: day(m.amcEndDate),
      issueTo: m.issueTo ?? '',
      transferTo: m.transferTo ?? '',
      documentUrl: m.documentUrl ?? '',
      note: m.note ?? '',
      staffNote: m.staffNote ?? '',
    });
    setBillerId(m.billerId ?? '');
    setWarehouseId(m.warehouseId ?? '');
  }, [isEdit, one.data, reset]);

  const submit = handleSubmit(async (v) => {
    const payload = {
      entryDate: v.entryDate || undefined,
      purchaseOrderNo: v.purchaseOrderNo || undefined,
      billerId: billerId || undefined,
      warehouseId: warehouseId || undefined,
      department: v.department || undefined,
      departmentRoom: v.departmentRoom || undefined,
      name: v.name,
      category: v.category || undefined,
      sellerName: v.sellerName || undefined,
      quantity: num(v.quantity),
      purchaseDate: v.purchaseDate || undefined,
      installationDate: v.installationDate || undefined,
      materialStatus: v.materialStatus || undefined,
      cost: num(v.cost),
      grandTotal: num(v.grandTotal),
      amcCost: num(v.amcCost),
      cmcCost: num(v.cmcCost),
      estimatedPresentCost: num(v.estimatedPresentCost),
      codalLife: v.codalLife || undefined,
      amcStatus: v.amcStatus || undefined,
      amcStartDate: v.amcStartDate || undefined,
      amcEndDate: v.amcEndDate || undefined,
      issueTo: v.issueTo || undefined,
      transferTo: v.transferTo || undefined,
      documentUrl: v.documentUrl || undefined,
      note: v.note || undefined,
      staffNote: v.staffNote || undefined,
    };
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, input: payload });
        toast.success('Material updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Material created');
      }
      navigate('/materials');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save material'));
    }
  });

  const saving = create.isPending || update.isPending;
  if (isEdit && one.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  // Render function (not a nested component) so inputs keep focus.
  const field = (
    name: keyof FormShape,
    label: string,
    required = false,
    type = 'text',
  ) => (
    <div className="ezht-col3">
      <div className="ezht-form-group">
        <label className="ezht-label" htmlFor={name}>
          {label}
          {required && <span className="ezht-req">*</span>}
        </label>
        <input
          id={name}
          type={type}
          step={type === 'number' ? 'any' : undefined}
          className="ezht-control"
          required={required}
          {...register(name, { required })}
        />
      </div>
    </div>
  );

  return (
    <div className="ezht-form" style={{ maxWidth: 1040 }}>
      <form onSubmit={submit} className="ezht-modal" aria-label="Material form">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {isEdit ? 'Edit Material' : 'Add Material'}
          </h4>
        </div>

        <div className="ezht-modal-body">
          <div className="ezht-row">
            {field('entryDate', 'Date', true, 'date')}
            {field('purchaseOrderNo', 'Purchase Order No')}
            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="biller">
                  Biller<span className="ezht-req">*</span>
                </label>
                <InfiniteSelect
                  id="biller"
                  value={billerId}
                  onChange={setBillerId}
                  queryKey={['billers']}
                  path="/billers"
                  getOptionValue={(r) => String(r.id ?? '')}
                  getOptionLabel={(r) => String(r.name ?? '')}
                  placeholder="Select biller…"
                  clearable
                />
              </div>
            </div>

            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="warehouse">
                  Warehouse<span className="ezht-req">*</span>
                </label>
                <select
                  id="warehouse"
                  className="ezht-control"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {field('department', 'Department')}
            {field('departmentRoom', 'Department Room')}

            {field('name', 'Product Name', true)}
            {field('category', 'Product Category')}
            {field('sellerName', 'Seller Name')}
            {field('quantity', 'Quantity', true, 'number')}
            {field('purchaseDate', 'Purchase Date', false, 'date')}
            {field('installationDate', 'Installation Date', false, 'date')}

            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="materialStatus">
                  Material Status<span className="ezht-req">*</span>
                </label>
                <select
                  id="materialStatus"
                  className="ezht-control"
                  required
                  {...register('materialStatus', { required: true })}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            {field('cost', 'Unit Price', false, 'number')}
            {field('grandTotal', 'Grand Total', false, 'number')}
            {field('amcCost', 'AMC Cost', false, 'number')}
            {field('cmcCost', 'CMC Cost', false, 'number')}
            {field('estimatedPresentCost', 'Estimated Present Cost', false, 'number')}
            {field('codalLife', 'Codal Life')}

            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="amcStatus">
                  AMC Status<span className="ezht-req">*</span>
                </label>
                <select
                  id="amcStatus"
                  className="ezht-control"
                  required
                  {...register('amcStatus', { required: true })}
                >
                  <option value="pending">Pending</option>
                  <option value="due">Due</option>
                  <option value="expired">Expired</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
            {field('amcStartDate', 'AMC Start Date', false, 'date')}
            {field('amcEndDate', 'AMC End Date', false, 'date')}
            {field('issueTo', 'Issue To')}
            {field('transferTo', 'Transfer To')}
            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label">Document</label>
                <AttachmentUpload
                  value={watch('documentUrl') ?? ''}
                  onChange={(url) => setValue('documentUrl', url)}
                />
              </div>
            </div>
          </div>

          <div className="ezht-row">
            <div className="ezht-col">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="note">Material Note</label>
                <textarea id="note" className="ezht-control" style={{ height: 100 }} {...register('note')} />
              </div>
            </div>
            <div className="ezht-col">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="staffNote">Staff Note</label>
                <textarea id="staffNote" className="ezht-control" style={{ height: 100 }} {...register('staffNote')} />
              </div>
            </div>
          </div>
        </div>

        <div className="ezht-modal-footer">
          <button type="button" className="ezht-btn ezht-btn-default" onClick={() => navigate('/materials')}>
            Cancel
          </button>
          <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
