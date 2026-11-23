import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { incomeHooks } from '@/features/incomes/api';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { useBranchOptions } from '@/features/_shared/branches';
import { getApiErrorMessage } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
import '@/styles/ezht-form.css';

interface FormShape {
  date: string;
  reference: string;
  amount: string;
  taxMethod: string;
  attachmentUrl: string;
  note: string;
}

const EMPTY: FormShape = {
  date: '',
  reference: '',
  amount: '',
  taxMethod: 'gst',
  attachmentUrl: '',
  note: '',
};

/**
 * Add / Edit Income — faithful port of the EZ Health Track "Add Income" modal:
 * single-column body with Date, Reference, Category, Warehouse, Amount, Tax Method
 * (GST / iGST), Attachment and Note.
 */
export function IncomeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = incomeHooks.useOne(id);
  const create = incomeHooks.useCreate();
  const update = incomeHooks.useUpdate();
  const { data: branches } = useBranchOptions();
  const warehouses = useMemo(() => branches ?? [], [branches]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormShape>({
    defaultValues: EMPTY,
    mode: 'onTouched',
  });
  const [categoryId, setCategoryId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const i = one.data;
    reset({
      date: i.date ? i.date.slice(0, 10) : '',
      reference: i.reference,
      amount: String(i.amount),
      taxMethod: i.taxMethod ?? 'gst',
      attachmentUrl: i.attachmentUrl ?? '',
      note: i.note ?? '',
    });
    setCategoryId(i.categoryId ?? '');
    setWarehouseId(i.warehouseId ?? '');
  }, [isEdit, one.data, reset]);

  const submit = handleSubmit(async (v) => {
    const payload = {
      date: v.date || undefined,
      reference: v.reference || undefined,
      amount: v.amount === '' ? undefined : Number(v.amount),
      taxMethod: v.taxMethod || undefined,
      attachmentUrl: v.attachmentUrl || undefined,
      note: v.note || undefined,
      categoryId: categoryId || undefined,
      warehouseId: warehouseId || undefined,
    };
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, input: payload });
        toast.success('Income updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Income created');
      }
      navigate('/incomes');
    } catch (err) {
      const mapped = applyApiFieldErrors(err, setError, {
        fields: [
          'date',
          'reference',
          'amount',
          'taxMethod',
          'attachmentUrl',
          'note',
        ],
      });
      if (!mapped) toast.error(getApiErrorMessage(err, 'Could not save income'));
    }
  });

  const saving = create.isPending || update.isPending;
  if (isEdit && one.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="ezht-form" style={{ maxWidth: 560 }}>
      <form onSubmit={submit} className="ezht-modal" aria-label="Income form">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {isEdit ? 'Edit Income' : 'Add Income'}
          </h4>
        </div>

        <div className="ezht-modal-body">
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="date">
              Date<span className="ezht-req">*</span>
            </label>
            <input id="date" type="date" className="ezht-control" aria-invalid={!!errors.date} {...register('date', { required: 'Date is required' })} />
            {errors.date && <p className="ezht-error">{errors.date?.message as string}</p>}
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
              queryKey={['income-categories']}
              path="/income-categories"
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
            <input id="amount" type="number" step="any" className="ezht-control" aria-invalid={!!errors.amount} {...register('amount', { required: 'Amount is required' })} />
            {errors.amount && <p className="ezht-error">{errors.amount?.message as string}</p>}
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="taxMethod">
              Tax Method<span className="ezht-req">*</span>
            </label>
            <select id="taxMethod" className="ezht-control" aria-invalid={!!errors.taxMethod} {...register('taxMethod', { required: 'Tax Method is required' })}>
              <option value="gst">GST</option>
              <option value="igst">iGST</option>
            </select>
            {errors.taxMethod && <p className="ezht-error">{errors.taxMethod?.message as string}</p>}
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
          <button type="button" className="ezht-btn ezht-btn-default" onClick={() => navigate('/incomes')}>
            Cancel
          </button>
          <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Income'}
          </button>
        </div>
      </form>
    </div>
  );
}
