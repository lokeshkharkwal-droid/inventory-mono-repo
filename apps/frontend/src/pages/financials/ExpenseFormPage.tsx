import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { expenseHooks } from '@/features/expenses/api';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { useBranchOptions } from '@/features/_shared/branches';
import { getApiErrorMessage } from '@/lib/http';
import '@/styles/ezht-form.css';

interface FormShape {
  date: string;
  reference: string;
  amount: string;
  hsnCode: string;
  gstNo: string;
  attachmentUrl: string;
  note: string;
}

const EMPTY: FormShape = {
  date: '',
  reference: '',
  amount: '',
  hsnCode: '',
  gstNo: '',
  attachmentUrl: '',
  note: '',
};

/**
 * Add / Edit Expense — faithful port of the EZ Health Track "Add Expense" modal:
 * single-column body with Date, Reference, Category, Warehouse, Amount, HSN Code,
 * GST No., Attachment and Note (the legacy `tax_method` is commented out there,
 * so it is omitted here too).
 */
export function ExpenseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = expenseHooks.useOne(id);
  const create = expenseHooks.useCreate();
  const update = expenseHooks.useUpdate();
  const { data: branches } = useBranchOptions();
  const warehouses = useMemo(() => branches ?? [], [branches]);

  const { register, handleSubmit, reset } = useForm<FormShape>({
    defaultValues: EMPTY,
  });
  const [categoryId, setCategoryId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const e = one.data;
    reset({
      date: e.date ? e.date.slice(0, 10) : '',
      reference: e.reference,
      amount: String(e.amount),
      hsnCode: e.hsnCode ?? '',
      gstNo: e.gstNo ?? '',
      attachmentUrl: e.attachmentUrl ?? '',
      note: e.note ?? '',
    });
    setCategoryId(e.categoryId ?? '');
    setWarehouseId(e.warehouseId ?? '');
  }, [isEdit, one.data, reset]);

  const submit = handleSubmit(async (v) => {
    const payload = {
      date: v.date || undefined,
      reference: v.reference || undefined,
      amount: v.amount === '' ? undefined : Number(v.amount),
      hsnCode: v.hsnCode || undefined,
      gstNo: v.gstNo || undefined,
      attachmentUrl: v.attachmentUrl || undefined,
      note: v.note || undefined,
      categoryId: categoryId || undefined,
      warehouseId: warehouseId || undefined,
    };
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, input: payload });
        toast.success('Expense updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Expense created');
      }
      navigate('/expenses');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save expense'));
    }
  });

  const saving = create.isPending || update.isPending;
  if (isEdit && one.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="ezht-form" style={{ maxWidth: 560 }}>
      <form onSubmit={submit} className="ezht-modal" aria-label="Expense form">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h4>
        </div>

        <div className="ezht-modal-body">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="date">
              Date<span className="ezht-req">*</span>
            </label>
            <input id="date" type="date" className="ezht-control" required {...register('date', { required: true })} />
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="reference">Reference</label>
            <input id="reference" className="ezht-control" {...register('reference')} />
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="category">Category</label>
            <InfiniteSelect
              id="category"
              value={categoryId}
              onChange={setCategoryId}
              queryKey={['expense-categories']}
              path="/expense-categories"
              getOptionValue={(r) => String(r.id ?? '')}
              getOptionLabel={(r) => String(r.name ?? '')}
              placeholder="Select category…"
              clearable
            />
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="warehouse">Warehouse</label>
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

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="amount">
              Amount<span className="ezht-req">*</span>
            </label>
            <input id="amount" type="number" step="any" className="ezht-control" required {...register('amount', { required: true })} />
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="hsnCode">HSN Code</label>
            <input id="hsnCode" className="ezht-control" {...register('hsnCode')} />
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="gstNo">GST No.</label>
            <input id="gstNo" className="ezht-control" {...register('gstNo')} />
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="attachmentUrl">Attachment URL</label>
            <input id="attachmentUrl" className="ezht-control" {...register('attachmentUrl')} />
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="note">Note</label>
            <textarea id="note" className="ezht-control" {...register('note')} />
          </div>
        </div>

        <div className="ezht-modal-footer">
          <button type="button" className="ezht-btn ezht-btn-default" onClick={() => navigate('/expenses')}>
            Cancel
          </button>
          <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
