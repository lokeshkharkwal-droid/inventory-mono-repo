import { useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { getApiErrorMessage } from '@/lib/http';
import { useBranchOptions } from '@/features/_shared/branches';
import { useCreateTransfer } from './api';
import '@/styles/ezht-form.css';

interface LineRow {
  productId: string;
  productName?: string;
  expiryDate: string;
  productSerial: string;
  packSize: string;
  packQuantity: string;
  quantity: string;
  rate: string;
  mrp: string;
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
  expiryDate: '',
  productSerial: '',
  packSize: '',
  packQuantity: '',
  quantity: '1',
  rate: '0',
  mrp: '0',
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
}

/**
 * Create-transfer form — faithful EZ Health Track "Add Transfer": header
 * (date, from/to warehouse, reference, from/to department) + a full item grid
 * (expiry, serial, pack size/qty, rate, MRP, tax, live subtotal) + shipping,
 * note and a live grand total. The two-stage send/receive stock flow is unchanged.
 */
export function TransferForm({ onDone }: Props) {
  const create = useCreateTransfer();
  const { data: branches } = useBranchOptions();
  const branchOptions = useMemo(() => branches ?? [], [branches]);

  const { register, handleSubmit, control, watch, setValue, reset } =
    useForm<FormValues>({
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

  // Live totals.
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedShipping = useWatch({ control, name: 'shipping' });
  const grandTotal = useMemo(() => {
    const items = (watchedItems ?? []) as LineRow[];
    const total = items.reduce((s, r) => s + lineSubtotal(r), 0);
    return total + n(watchedShipping ?? '0');
  }, [watchedItems, watchedShipping]);

  const submit = handleSubmit(async (v) => {
    const items = v.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: n(i.quantity),
        expiryDate: i.expiryDate || undefined,
        productSerial: i.productSerial || undefined,
        packSize: i.packSize || undefined,
        packQuantity: i.packQuantity === '' ? undefined : n(i.packQuantity),
        rate: i.rate === '' ? undefined : n(i.rate),
        mrp: i.mrp === '' ? undefined : n(i.mrp),
        taxRate: i.taxRate === '' ? undefined : n(i.taxRate),
      }));
    if (items.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    if (v.fromBranchId === v.toBranchId) {
      toast.error('Source and destination must differ.');
      return;
    }
    try {
      await create.mutateAsync({
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
      });
      toast.success('Transfer created');
      reset();
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create transfer'));
    }
  });

  const cell = { padding: '4px 6px', border: '1px solid #ddd' } as const;
  const th = { ...cell, background: '#f5f5f5', textAlign: 'left' as const };

  return (
    <form onSubmit={submit} className="ezht-modal-body">
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
            <select id="fromBranchId" className="ezht-control" {...register('fromBranchId', { required: true })}>
              <option value="">Select warehouse</option>
              {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="ezht-col3">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="toBranchId">
              To Warehouse<span className="ezht-req">*</span>
            </label>
            <select id="toBranchId" className="ezht-control" {...register('toBranchId', { required: true })}>
              <option value="">Select warehouse</option>
              {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
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
                <th style={th}>Product Tax</th>
                <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id}>
                  <td style={cell}>
                    <Controller
                      control={control}
                      name={`items.${i}.productId`}
                      render={({ field }) => (
                        <InfiniteSelect
                          value={field.value}
                          onChange={field.onChange}
                          onSelect={(p) => {
                            setValue(`items.${i}.productName`, p.name);
                            if (p.price != null) setValue(`items.${i}.rate`, String(p.price));
                          }}
                          queryKey={['products']}
                          path="/products"
                          getOptionValue={(p) => p.id}
                          getOptionLabel={(p) => p.name}
                          selectedLabel={watch(`items.${i}.productName`)}
                          placeholder="Select product…"
                        />
                      )}
                    />
                  </td>
                  <td style={cell}><input type="date" className="ezht-control" {...register(`items.${i}.expiryDate`)} /></td>
                  <td style={cell}><input className="ezht-control" {...register(`items.${i}.productSerial`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 70 }} {...register(`items.${i}.packSize`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 70 }} type="number" step="any" {...register(`items.${i}.packQuantity`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 70 }} type="number" step="any" {...register(`items.${i}.quantity`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 80 }} type="number" step="any" {...register(`items.${i}.rate`)} /></td>
                  <td style={cell}><input className="ezht-control" style={{ width: 80 }} type="number" step="any" {...register(`items.${i}.mrp`)} /></td>
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
        <button type="submit" className="ezht-btn ezht-btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Add Transfer'}
        </button>
      </div>
    </form>
  );
}
