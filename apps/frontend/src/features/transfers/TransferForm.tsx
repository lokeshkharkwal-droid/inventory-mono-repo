import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { BatchSearchSelect } from '@/features/orders/BatchSearchSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { getApiErrorMessage } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { FieldError } from '@/components/ui/field-error';
import { useBranchOptions } from '@/features/_shared/branches';
import { useCreateTransfer, useTransfer, useUpdateTransfer } from './api';
import '@/styles/ezht-form.css';

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  /** The specific source batch this line draws from (EZHT batch/option). */
  batchId: string;
  /** Available quantity in the chosen batch — caps the entered quantity. */
  availableQty: string;
  expiryDate: string;
  productSerial: string;
  packSize: string;
  packQuantity: string;
  quantity: string;
  rate: string;
  mrp: string;
  packMrp: string;
  hsnCode: string;
  taxRate: string;
}

interface FormValues {
  fromBranchId: string;
  toBranchId: string;
  fromDepartment: string;
  toDepartment: string;
  reference: string;
  date: string;
  shipping: string;
  note: string;
  status: string;
  attachmentUrl: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  batchId: '',
  availableQty: '0',
  expiryDate: '',
  productSerial: '',
  packSize: '',
  packQuantity: '',
  quantity: '1',
  rate: '0',
  mrp: '0',
  packMrp: '0',
  hsnCode: '',
  taxRate: '0',
};

const n = (v: string) => Number(v || 0);
const lineSubtotal = (r: LineRow) => {
  const base = n(r.rate) * n(r.quantity);
  return base + (base * n(r.taxRate)) / 100;
};

interface Props {
  /** Called after a successful save or on cancel. */
  onDone: () => void;
  /** When set, edit this transfer instead of creating a new one. */
  editId?: string | null;
}

/**
 * Create/edit-transfer form — faithful EZ Health Track "Add Transfer": header
 * (date, from/to warehouse, reference, from/to department) + a full item grid
 * (expiry, serial, pack size/qty, rate, MRP, pack MRP, HSN, tax, live subtotal)
 * + shipping, status (Completed/Pending/Sent), note and a live grand total.
 * The two-stage send/receive stock flow is unchanged; edit is PENDING-only.
 */
export function TransferForm({ onDone, editId }: Props) {
  const create = useCreateTransfer();
  const update = useUpdateTransfer();
  const { data: editing } = useTransfer(editId ?? undefined);
  const { data: branches } = useBranchOptions();
  const branchOptions = useMemo(() => branches ?? [], [branches]);
  const saving = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
      mode: 'onTouched',
      defaultValues: {
        fromBranchId: '',
        toBranchId: '',
        fromDepartment: '',
        toDepartment: '',
        reference: '',
        date: '',
        shipping: '0',
        note: '',
        status: 'PENDING',
        attachmentUrl: '',
        items: [{ ...EMPTY_ROW }],
      },
    });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Hydrate when editing.
  useEffect(() => {
    if (!editId || !editing) return;
    reset({
      fromBranchId: editing.fromBranchId ?? '',
      toBranchId: editing.toBranchId ?? '',
      fromDepartment: editing.fromDepartment ?? '',
      toDepartment: editing.toDepartment ?? '',
      reference: editing.reference ?? '',
      date: editing.date ? String(editing.date).slice(0, 10) : '',
      shipping: String(editing.shipping ?? 0),
      note: editing.note ?? '',
      status: editing.status ?? 'PENDING',
      attachmentUrl: editing.attachmentUrl ?? '',
      items: (editing.items ?? []).map((i) => ({
        ...EMPTY_ROW,
        productId: String(i.productId ?? ''),
        productName: String(i.productName ?? ''),
        productCode: String(i.productCode ?? ''),
        batchId: String(i.batchId ?? ''),
        expiryDate: i.expiryDate ? String(i.expiryDate).slice(0, 10) : '',
        productSerial: String(i.productSerial ?? ''),
        packSize: String(i.packSize ?? ''),
        packQuantity: i.packQuantity != null ? String(i.packQuantity) : '',
        quantity: String(i.quantity ?? 1),
        rate: i.rate != null ? String(i.rate) : '0',
        mrp: i.mrp != null ? String(i.mrp) : '0',
        packMrp: i.packMrp != null ? String(i.packMrp) : '0',
        hsnCode: String(i.hsnCode ?? ''),
        taxRate: i.taxRate != null ? String(i.taxRate) : '0',
      })),
    });
  }, [editId, editing, reset]);

  // Live totals.
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedShipping = useWatch({ control, name: 'shipping' });
  const grandTotal = useMemo(() => {
    const items = (watchedItems ?? []) as LineRow[];
    const total = items.reduce((s, r) => s + lineSubtotal(r), 0);
    return total + n(watchedShipping ?? '0');
  }, [watchedItems, watchedShipping]);

  const submit = handleSubmit(async (v) => {
    const rows = v.items.filter((i) => i.productId);
    if (rows.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    // Quantity can't exceed the chosen batch's available quantity.
    for (let idx = 0; idx < rows.length; idx++) {
      const i = rows[idx]!;
      if (i.batchId && n(i.availableQty) > 0 && n(i.quantity) > n(i.availableQty)) {
        toast.error(
          `Line ${idx + 1}: quantity exceeds available batch qty (${i.availableQty}).`,
        );
        return;
      }
    }
    const items = rows.map((i) => ({
      productId: i.productId,
      batchId: i.batchId || undefined,
      quantity: n(i.quantity),
      expiryDate: i.expiryDate || undefined,
      productSerial: i.productSerial || undefined,
      packSize: i.packSize || undefined,
      packQuantity: i.packQuantity === '' ? undefined : n(i.packQuantity),
      rate: i.rate === '' ? undefined : n(i.rate),
      mrp: i.mrp === '' ? undefined : n(i.mrp),
      packMrp: i.packMrp === '' ? undefined : n(i.packMrp),
      hsnCode: i.hsnCode || undefined,
      taxRate: i.taxRate === '' ? undefined : n(i.taxRate),
    }));
    if (v.fromBranchId === v.toBranchId) {
      const msg = 'Source and destination must differ.';
      setError('toBranchId', { type: 'validate', message: msg });
      toast.error(msg);
      return;
    }
    const body = {
      fromBranchId: v.fromBranchId,
      toBranchId: v.toBranchId,
      reference: v.reference || undefined,
      date: v.date || undefined,
      note: v.note || undefined,
      fromDepartment: v.fromDepartment || undefined,
      toDepartment: v.toDepartment || undefined,
      shipping: v.shipping === '' ? undefined : n(v.shipping),
      status: v.status || undefined,
      attachmentUrl: v.attachmentUrl || undefined,
      items,
    };
    try {
      if (editId) await update.mutateAsync({ id: editId, input: body });
      else await create.mutateAsync(body);
      toast.success(editId ? 'Transfer updated' : 'Transfer created');
      if (!editId) reset();
      onDone();
    } catch (err) {
      const mapped = applyApiFieldErrors(err, setError, {
        fields: ['fromBranchId', 'toBranchId', 'date', 'reference'],
      });
      if (!mapped)
        toast.error(getApiErrorMessage(err, 'Could not save transfer'));
    }
  });

  const cell = { padding: '4px 6px', border: '1px solid #ddd' } as const;
  const th = { ...cell, background: '#f5f5f5', textAlign: 'left' as const };

  return (
    <form onSubmit={submit} className="ezht-modal-body">
      {editId && editing && editing.status !== 'PENDING' ? (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '8px 12px',
            borderRadius: 4,
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          This transfer is{' '}
          {editing.status === 'IN_TRANSIT' ? 'Sent' : 'Completed'}. Saving will
          reverse the previous stock movement and re-apply it for the selected
          status.
        </div>
      ) : null}
      <div className="ezht-row">
        <div className="ezht-col3">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="date">Date</label>
            <input id="date" type="date" className="ezht-control" {...register('date')} />
          </div>
        </div>
        <div className="ezht-col3">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="fromBranchId">
              From Warehouse<span className="ezht-req">*</span>
            </label>
            <select
              id="fromBranchId"
              className="ezht-control aria-[invalid=true]:border-destructive"
              aria-invalid={!!errors.fromBranchId}
              {...register('fromBranchId', {
                required: 'From Warehouse is required',
              })}
            >
              <option value="">Select warehouse</option>
              {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <FieldError message={errors.fromBranchId?.message as string} />
          </div>
        </div>
        <div className="ezht-col3">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="toBranchId">
              To Warehouse<span className="ezht-req">*</span>
            </label>
            <select
              id="toBranchId"
              className="ezht-control aria-[invalid=true]:border-destructive"
              aria-invalid={!!errors.toBranchId}
              {...register('toBranchId', {
                required: 'To Warehouse is required',
              })}
            >
              <option value="">Select warehouse</option>
              {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <FieldError message={errors.toBranchId?.message as string} />
          </div>
        </div>
        <div className="ezht-col3">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="reference">Reference No</label>
            <input id="reference" className="ezht-control" placeholder="Auto if blank" {...register('reference')} />
          </div>
        </div>
        <div className="ezht-col3">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="fromDepartment">From Department</label>
            <input id="fromDepartment" className="ezht-control" {...register('fromDepartment')} />
          </div>
        </div>
        <div className="ezht-col3">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="toDepartment">To Department</label>
            <input id="toDepartment" className="ezht-control" {...register('toDepartment')} />
          </div>
        </div>
      </div>

      <div className="ezht-form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="ezht-label">Order Items</label>
          <button type="button" className="ezht-btn ezht-btn-default" onClick={() => append({ ...EMPTY_ROW })}>
            <Plus className="h-4 w-4" style={{ display: 'inline', verticalAlign: 'middle' }} /> Add product
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ ...th, minWidth: 180 }}>Product Name (Code)</th>
                <th style={th}>Expiry Date</th>
                <th style={th}>Product Serial</th>
                <th style={th}>Pack Size</th>
                <th style={th}>Pack Qty</th>
                <th style={th}>Quantity</th>
                <th style={th}>Rate</th>
                <th style={th}>MRP</th>
                <th style={th}>Pack MRP</th>
                <th style={th}>HSN Code</th>
                <th style={th}>Product Tax</th>
                <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id}>
                  <td style={cell}>
                    <BatchSearchSelect
                      value={watch(`items.${i}.productName`) ?? ''}
                      warehouseId={watch('fromBranchId') || undefined}
                      placeholder="Search product / batch…"
                      onPick={(r) => {
                        setValue(`items.${i}.productId`, r.productId);
                        setValue(`items.${i}.productName`, r.productName);
                        setValue(`items.${i}.productCode`, r.productCode ?? '');
                        setValue(`items.${i}.batchId`, r.batchId);
                        setValue(
                          `items.${i}.expiryDate`,
                          r.expiryDate ? r.expiryDate.slice(0, 10) : '',
                        );
                        setValue(
                          `items.${i}.productSerial`,
                          r.serialNo ?? r.batchNo ?? '',
                        );
                        setValue(`items.${i}.rate`, String(r.cost ?? r.price ?? 0));
                        setValue(`items.${i}.mrp`, String(r.mrp ?? 0));
                        setValue(`items.${i}.hsnCode`, r.hsnCode ?? '');
                        setValue(
                          `items.${i}.packSize`,
                          r.packSize != null ? String(r.packSize) : '',
                        );
                        setValue(`items.${i}.taxRate`, String(r.taxRate ?? 0));
                        setValue(
                          `items.${i}.availableQty`,
                          String(r.quantity ?? 0),
                        );
                      }}
                    />
                    {watch(`items.${i}.productCode`) ? (
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {watch(`items.${i}.productCode`)} · Avail:{' '}
                        {watch(`items.${i}.availableQty`)}
                      </div>
                    ) : null}
                  </td>
                  <td style={cell}><input type="date" className="ezht-control" {...register(`items.${i}.expiryDate`)} /></td>
                  <td style={cell}><input className="ezht-control" {...register(`items.${i}.productSerial`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 70 }} {...register(`items.${i}.packSize`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 70 }} type="number" step="any" {...register(`items.${i}.packQuantity`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 70 }} type="number" step="any" {...register(`items.${i}.quantity`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 80 }} type="number" step="any" {...register(`items.${i}.rate`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 80 }} type="number" step="any" {...register(`items.${i}.mrp`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 80 }} type="number" step="any" {...register(`items.${i}.packMrp`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 80 }} {...register(`items.${i}.hsnCode`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 60 }} type="number" step="any" {...register(`items.${i}.taxRate`)} /></td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {lineSubtotal((watchedItems?.[i] ?? EMPTY_ROW) as LineRow).toFixed(2)}
                  </td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <button type="button" className="ezht-btn ezht-btn-default" onClick={() => remove(i)} title="Remove">
                      <Trash2 className="h-4 w-4" style={{ display: 'inline' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ezht-row">
        <div className="ezht-col">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="shipping">Shipping</label>
            <input id="shipping" className="ezht-control" type="number" step="any" {...register('shipping')} />
          </div>
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="status">Status</label>
            <select id="status" className="ezht-control" {...register('status')}>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">Sent</option>
            </select>
          </div>
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="attachmentUrl">Document</label>
            <Controller
              control={control}
              name="attachmentUrl"
              render={({ field }) => (
                <AttachmentUpload
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="note">Note</label>
            <textarea id="note" className="ezht-control" style={{ height: 70 }} {...register('note')} />
          </div>
        </div>
        <div className="ezht-col" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Grand Total: {grandTotal.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="ezht-modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <button type="button" className="ezht-btn ezht-btn-default" onClick={onDone}>Cancel</button>
        <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : editId ? 'Update Transfer' : 'Add Transfer'}
        </button>
      </div>
    </form>
  );
}
