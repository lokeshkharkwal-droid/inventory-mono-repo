import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BatchSearchSelect } from '@/features/orders/BatchSearchSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { getApiErrorMessage, getTokenPayload } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { FieldError } from '@/components/ui/field-error';
import { useBranchOptions } from '@/features/_shared/branches';
import { useDepartmentOptions } from '@/features/_shared/departments';
import { useBillers, useTaxRates } from '@/features/_shared/options';
import { computeOrder } from '@/features/orders/totals';
import {
  useRequisition,
  useCreateRequisition,
  useUpdateRequisition,
} from './api';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm aria-[invalid=true]:border-destructive';
const inputSm = 'h-9';

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  /** Specific source batch chosen for this line (EZHT batch/option). */
  batchId: string;
  /** Available quantity in the chosen batch — used to cap the entered quantity. */
  availableQty: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
  taxRate: string;
}

interface FormValues {
  fromBranchId: string;
  toBranchId: string;
  billerId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  reference: string;
  date: string;
  localPurchase: string;
  status: string;
  // EZHT referral block.
  referralSourceType: string;
  referralContactFname: string;
  referralContactMname: string;
  referralContactLname: string;
  referralBusinessName: string;
  referralBusinessAddress: string;
  referralDoctorName: string;
  attachmentUrl: string;
  note: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  batchId: '',
  availableQty: '0',
  quantity: '1',
  unitPrice: '0',
  discount: '0',
  taxRateId: '',
  taxRate: '0',
};

function defaults(): FormValues {
  return {
    fromBranchId: '',
    toBranchId: '',
    billerId: '',
    fromDepartmentId: '',
    toDepartmentId: '',
    reference: '',
    date: '',
    localPurchase: 'No',
    status: 'PENDING',
    referralSourceType: '',
    referralContactFname: '',
    referralContactMname: '',
    referralContactLname: '',
    referralBusinessName: '',
    referralBusinessAddress: '',
    referralDoctorName: '',
    attachmentUrl: '',
    note: '',
    items: [{ ...EMPTY_ROW }],
  };
}

interface Props {
  /** When set, edit this requisition instead of creating a new one. */
  editId?: string | null;
}

/**
 * Full-page requisition form — the EZHT add/edit requisition screen. A requisition
 * requests stock from a source (From) branch to the destination (To) branch, and
 * lines are chosen at the batch level (product + its source-branch purchase batch),
 * so the chosen batch carries through to the transfer on conversion. Field set is
 * trimmed to EZHT parity (no Supplier / Customer / Shipping / Order Tax / Order
 * Discount — those are sale-only). Editing is only allowed while PENDING.
 */
export function RequisitionForm({ editId }: Props) {
  const navigate = useNavigate();
  const { data: branches } = useBranchOptions();
  const { data: departments } = useDepartmentOptions();
  const { data: taxRates } = useTaxRates();
  const { data: billers } = useBillers();
  const [showReferral, setShowReferral] = useState(false);

  const { data: editing } = useRequisition(editId ?? undefined);
  const create = useCreateRequisition();
  const update = useUpdateRequisition();
  const saving = create.isPending || update.isPending;

  const activeBranchId = getTokenPayload()?.active_branch_id ?? null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: defaults(), mode: 'onTouched' });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Default the destination to the active branch on a fresh create.
  useEffect(() => {
    if (editId || !activeBranchId) return;
    setValue('toBranchId', activeBranchId);
  }, [editId, activeBranchId, setValue]);

  // Hydrate when editing.
  useEffect(() => {
    if (!editId || !editing) return;
    if (
      editing.referralSourceType ||
      editing.referralDoctorName ||
      editing.referralBusinessName
    ) {
      setShowReferral(true);
    }
    reset({
      ...defaults(),
      fromBranchId: editing.fromBranchId ?? '',
      toBranchId: editing.branchId ?? activeBranchId ?? '',
      billerId: editing.billerId ?? '',
      fromDepartmentId: editing.fromDepartmentId ?? '',
      toDepartmentId: editing.toDepartmentId ?? '',
      reference: editing.reference ?? '',
      date: editing.date ? String(editing.date).slice(0, 10) : '',
      localPurchase: editing.localPurchase ? 'Yes' : 'No',
      status: editing.status ?? 'PENDING',
      referralSourceType: editing.referralSourceType ?? '',
      referralContactFname: editing.referralContactFname ?? '',
      referralContactMname: editing.referralContactMname ?? '',
      referralContactLname: editing.referralContactLname ?? '',
      referralBusinessName: editing.referralBusinessName ?? '',
      referralBusinessAddress: editing.referralBusinessAddress ?? '',
      referralDoctorName: editing.referralDoctorName ?? '',
      attachmentUrl: editing.attachmentUrl ?? '',
      note: editing.note ?? '',
      items: (editing.items ?? []).map((i) => ({
        ...EMPTY_ROW,
        productId: String(i.productId ?? ''),
        productName: String(i.productName ?? ''),
        productCode: String(i.productCode ?? ''),
        batchId: String(i.batchId ?? ''),
        quantity: String(i.quantity ?? 1),
        unitPrice: String(i.unitPrice ?? 0),
        discount: String(i.discountSpec ?? i.discount ?? 0),
        taxRateId: String(i.taxRateId ?? ''),
        taxRate: String(i.taxRate ?? 0),
      })),
    });
  }, [editId, editing, reset]);

  const live = useWatch({ control }) as Partial<FormValues>;
  const watchedItems = useMemo(() => live.items ?? [], [live.items]);

  const totals = useMemo(
    () =>
      computeOrder({
        lines: watchedItems.map((l) => ({
          quantity: Number(l?.quantity || 0),
          unitPrice: Number(l?.unitPrice || 0),
          discount: l?.discount,
          taxRatePercent: Number(l?.taxRate || 0),
        })),
      }),
    [watchedItems],
  );

  const submit = handleSubmit(async (v) => {
    const rows = v.items.filter((i) => i.productId);
    if (rows.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    // Quantity can't exceed the chosen batch's available quantity.
    for (let idx = 0; idx < rows.length; idx++) {
      const i = rows[idx]!;
      if (
        i.batchId &&
        Number(i.availableQty) > 0 &&
        Number(i.quantity) > Number(i.availableQty)
      ) {
        toast.error(
          `Line ${idx + 1}: quantity exceeds available batch qty (${i.availableQty}).`,
        );
        return;
      }
    }

    const items = rows.map((i) => ({
      productId: i.productId,
      batchId: i.batchId || undefined,
      quantity: Number(i.quantity || 0),
      unitPrice: Number(i.unitPrice || 0),
      discount: i.discount || undefined,
      taxRate: Number(i.taxRate || 0),
      taxRateId: i.taxRateId || undefined,
    }));

    const billerName = (billers ?? []).find((b) => b.id === v.billerId)?.name;
    const referral =
      v.referralSourceType ||
      v.referralContactFname ||
      v.referralContactLname ||
      v.referralBusinessName ||
      v.referralDoctorName
        ? {
            sourceType: v.referralSourceType || undefined,
            contactFname: v.referralContactFname || undefined,
            contactMname: v.referralContactMname || undefined,
            contactLname: v.referralContactLname || undefined,
            businessName: v.referralBusinessName || undefined,
            businessAddress: v.referralBusinessAddress || undefined,
            doctorName: v.referralDoctorName || undefined,
          }
        : undefined;

    const body = {
      fromBranchId: v.fromBranchId || undefined,
      toBranchId: v.toBranchId || undefined,
      billerId: v.billerId || undefined,
      billerName: billerName || undefined,
      fromDepartmentId: v.fromDepartmentId || undefined,
      toDepartmentId: v.toDepartmentId || undefined,
      reference: v.reference || undefined,
      date: v.date || undefined,
      localPurchase: v.localPurchase === 'Yes',
      status: v.status || undefined,
      referral,
      attachmentUrl: v.attachmentUrl || undefined,
      note: v.note || undefined,
      items,
    };

    try {
      if (editId) await update.mutateAsync({ id: editId, input: body });
      else await create.mutateAsync(body);
      toast.success(editId ? 'Requisition updated' : 'Requisition created');
      navigate('/requisitions');
    } catch (err) {
      const mapped = applyApiFieldErrors(err, setError, {
        fields: [
          'fromBranchId',
          'fromDepartmentId',
          'toDepartmentId',
          'date',
          'reference',
        ],
      });
      if (!mapped)
        toast.error(getApiErrorMessage(err, 'Could not save requisition'));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/requisitions')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            {editId ? 'Edit' : 'Add'} Requisition
          </h1>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* ── Header (EZHT order: Date, Biller, From/To Warehouse, Reference, From/To Dept) ── */}
      <section className="grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" {...register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label>Biller</Label>
          <select className={selectCls} {...register('billerId')}>
            <option value="">— select —</option>
            {(billers ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>From Warehouse (source)</Label>
          <select
            className={selectCls}
            aria-invalid={!!errors.fromBranchId}
            {...register('fromBranchId', {
              required: 'From warehouse is required',
            })}
          >
            <option value="">— select —</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.fromBranchId?.message as string} />
        </div>
        <div className="space-y-1.5">
          <Label>To Warehouse (destination)</Label>
          <select
            className={selectCls}
            aria-invalid={!!errors.toBranchId}
            {...register('toBranchId', {
              required: 'To warehouse is required',
            })}
          >
            <option value="">— select —</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.toBranchId?.message as string} />
        </div>
        <div className="space-y-1.5">
          <Label>Reference</Label>
          <Input placeholder="Auto if blank" {...register('reference')} />
        </div>
        <div className="space-y-1.5">
          <Label>From department</Label>
          <select className={selectCls} {...register('fromDepartmentId')}>
            <option value="">— none —</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>To department</Label>
          <select className={selectCls} {...register('toDepartmentId')}>
            <option value="">— none —</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Local purchase</Label>
          <select className={selectCls} {...register('localPurchase')}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select id="status" className={selectCls} {...register('status')}>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
          </select>
        </div>
      </section>

      {/* ── Order items (batch-level product selection) ── */}
      <section className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Order items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...EMPTY_ROW })}
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Product Name (Product Code)</th>
                <th className="px-1">Net Unit Price</th>
                <th className="px-1">Quantity</th>
                <th className="px-1">Discount</th>
                <th className="px-1">Product Tax</th>
                <th className="px-1 text-right">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id} className="border-b align-top">
                  <td className="py-2 pr-2" style={{ minWidth: 240 }}>
                    <BatchSearchSelect
                      value={watchedItems[i]?.productName ?? ''}
                      warehouseId={live.fromBranchId || undefined}
                      placeholder="Search product / batch…"
                      onPick={(r) => {
                        setValue(`items.${i}.productId`, r.productId);
                        setValue(`items.${i}.productName`, r.productName);
                        setValue(`items.${i}.productCode`, r.productCode ?? '');
                        setValue(`items.${i}.batchId`, r.batchId);
                        setValue(
                          `items.${i}.unitPrice`,
                          String(r.cost ?? r.price ?? 0),
                        );
                        setValue(`items.${i}.taxRateId`, r.taxRateId ?? '');
                        setValue(`items.${i}.taxRate`, String(r.taxRate ?? 0));
                        setValue(
                          `items.${i}.availableQty`,
                          String(r.quantity ?? 0),
                        );
                        if (!watchedItems[i]?.quantity)
                          setValue(`items.${i}.quantity`, '1');
                      }}
                    />
                    {watchedItems[i]?.productCode ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {watchedItems[i]?.productCode}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-1" style={{ width: 120 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.unitPrice`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 110 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.quantity`)}
                    />
                    {watchedItems[i]?.batchId ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Available: {watchedItems[i]?.availableQty ?? 0}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-1" style={{ width: 90 }}>
                    <Input
                      className={inputSm}
                      placeholder="0 or 5%"
                      {...register(`items.${i}.discount`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 150 }}>
                    <select
                      className={`${selectCls} h-9`}
                      value={watchedItems[i]?.taxRateId ?? ''}
                      onChange={(e) => {
                        const tr = (taxRates ?? []).find(
                          (t) => t.id === e.target.value,
                        );
                        setValue(`items.${i}.taxRateId`, e.target.value);
                        setValue(
                          `items.${i}.taxRate`,
                          tr ? String(tr.rate) : '0',
                        );
                      }}
                    >
                      <option value="">No tax</option>
                      {(taxRates ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.rate}%)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 text-right tabular-nums">
                    {(totals.lines[i]?.subtotal ?? 0).toFixed(2)}
                  </td>
                  <td className="px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── More options ── */}
        <section className="space-y-3 rounded-lg border p-4">
          <Label className="text-base">More options</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Document</Label>
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
            <div className="col-span-2 space-y-1.5">
              <Label>Note</Label>
              <Input {...register('note')} />
            </div>

            {/* ── Referral (EZHT referral block) ── */}
            <div className="col-span-2 space-y-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReferral((s) => !s)}
              >
                {showReferral ? 'Hide referral' : 'Add referral'}
              </Button>
              {showReferral && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Source type</Label>
                    <select
                      className={selectCls}
                      {...register('referralSourceType')}
                    >
                      <option value="">— select —</option>
                      <option value="doctor">Doctor</option>
                      <option value="insurance">Insurance</option>
                      <option value="personal">Personal</option>
                      <option value="agency">Agency</option>
                      <option value="hospital">Hospital</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Doctor name</Label>
                    <Input {...register('referralDoctorName')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact first name</Label>
                    <Input {...register('referralContactFname')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact middle name</Label>
                    <Input {...register('referralContactMname')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact last name</Label>
                    <Input {...register('referralContactLname')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Business name</Label>
                    <Input {...register('referralBusinessName')} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Business address</Label>
                    <Input {...register('referralBusinessAddress')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Totals ── */}
        <section className="space-y-1 rounded-lg border p-4 text-sm">
          <Row label="Items" value={totals.totalItems} />
          <Row label="Total" value={totals.subtotal} money />
          <Row label="Product discount" value={totals.productDiscount} money />
          <Row label="Tax" value={totals.totalTax} money />
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>Grand total</span>
            <span className="tabular-nums">{totals.grandTotal.toFixed(2)}</span>
          </div>
        </section>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  money,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        {money ? value.toFixed(2) : Math.round(value)}
      </span>
    </div>
  );
}
