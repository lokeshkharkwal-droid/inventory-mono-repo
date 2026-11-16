import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { getApiErrorMessage, getTokenPayload } from '@/lib/http';
import { useBranchOptions } from '@/features/_shared/branches';
import { useDepartmentOptions } from '@/features/_shared/departments';
import { useTaxRates } from '@/features/_shared/options';
import { computeOrder } from '@/features/orders/totals';
import {
  useRequisition,
  useCreateRequisition,
  useUpdateRequisition,
} from './api';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const inputSm = 'h-9';

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
  taxRate: string;
}

interface FormValues {
  fromBranchId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  reference: string;
  date: string;
  localPurchase: string;
  status: string;
  orderDiscount: string;
  orderTax: string;
  shipping: string;
  attachmentUrl: string;
  note: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  quantity: '1',
  unitPrice: '0',
  discount: '0',
  taxRateId: '',
  taxRate: '0',
};

function defaults(): FormValues {
  return {
    fromBranchId: '',
    fromDepartmentId: '',
    toDepartmentId: '',
    reference: '',
    date: '',
    localPurchase: 'No',
    status: 'PENDING',
    orderDiscount: '0',
    orderTax: '0',
    shipping: '0',
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
 * requests stock from a source (From) branch to the active (To) branch. The
 * destination is always the caller's active branch (§4.7 — never trust a client
 * branchId), shown read-only. Line grid + more-options + live totals mirror the
 * legacy layout; editing is only allowed while PENDING.
 */
export function RequisitionForm({ editId }: Props) {
  const navigate = useNavigate();
  const { data: branches } = useBranchOptions();
  const { data: departments } = useDepartmentOptions();
  const { data: taxRates } = useTaxRates();

  const { data: editing } = useRequisition(editId ?? undefined);
  const create = useCreateRequisition();
  const update = useUpdateRequisition();
  const saving = create.isPending || update.isPending;

  const activeBranchId = getTokenPayload()?.active_branch_id ?? null;
  const activeBranchName = useMemo(
    () => (branches ?? []).find((b) => b.id === activeBranchId)?.name ?? null,
    [branches, activeBranchId],
  );

  const { register, handleSubmit, control, reset, setValue } =
    useForm<FormValues>({ defaultValues: defaults() });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Hydrate when editing.
  useEffect(() => {
    if (!editId || !editing) return;
    reset({
      ...defaults(),
      fromBranchId: editing.fromBranchId ?? '',
      fromDepartmentId: editing.fromDepartmentId ?? '',
      toDepartmentId: editing.toDepartmentId ?? '',
      reference: editing.reference ?? '',
      date: editing.date ? String(editing.date).slice(0, 10) : '',
      localPurchase: editing.localPurchase ? 'Yes' : 'No',
      status: editing.status ?? 'PENDING',
      orderDiscount: String(editing.orderDiscountSpec ?? editing.orderDiscount ?? 0),
      orderTax: String(editing.orderTax ?? 0),
      shipping: String(editing.shipping ?? 0),
      attachmentUrl: editing.attachmentUrl ?? '',
      note: editing.note ?? '',
      items: (editing.items ?? []).map((i) => ({
        ...EMPTY_ROW,
        productId: String(i.productId ?? ''),
        productName: String(i.productName ?? ''),
        productCode: String(i.productCode ?? ''),
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
        orderDiscount: live.orderDiscount,
        orderTaxPercent: Number(live.orderTax || 0),
        shipping: Number(live.shipping || 0),
      }),
    [watchedItems, live.orderDiscount, live.orderTax, live.shipping],
  );

  const submit = handleSubmit(async (v) => {
    const items = v.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity || 0),
        unitPrice: Number(i.unitPrice || 0),
        discount: i.discount || undefined,
        taxRate: Number(i.taxRate || 0),
        taxRateId: i.taxRateId || undefined,
      }));
    if (items.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }

    const body = {
      fromBranchId: v.fromBranchId || undefined,
      fromDepartmentId: v.fromDepartmentId || undefined,
      toDepartmentId: v.toDepartmentId || undefined,
      reference: v.reference || undefined,
      date: v.date || undefined,
      localPurchase: v.localPurchase === 'Yes',
      status: v.status || undefined,
      orderDiscount: v.orderDiscount || undefined,
      orderTax: Number(v.orderTax || 0),
      shipping: Number(v.shipping || 0),
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

      {/* ── Header ── */}
      <section className="grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" {...register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label>Reference</Label>
          <Input placeholder="Auto if blank" {...register('reference')} />
        </div>
        <div className="space-y-1.5">
          <Label>From branch (source)</Label>
          <select className={selectCls} {...register('fromBranchId')}>
            <option value="">— select —</option>
            {(branches ?? [])
              .filter((b) => b.id !== activeBranchId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
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
          <Label>To branch (destination)</Label>
          {/* Destination is always the active branch (§4.7). */}
          <select className={selectCls} value={activeBranchId ?? ''} disabled>
            <option value={activeBranchId ?? ''}>
              {activeBranchName ?? 'Active branch'}
            </option>
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

      {/* ── Order items ── */}
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
                  <td className="py-2 pr-2" style={{ minWidth: 220 }}>
                    <Controller
                      control={control}
                      name={`items.${i}.productId`}
                      render={({ field }) => (
                        <InfiniteSelect
                          value={field.value}
                          onChange={field.onChange}
                          onSelect={(p) => {
                            setValue(`items.${i}.productName`, p.name);
                            setValue(`items.${i}.productCode`, p.code ?? '');
                            setValue(
                              `items.${i}.unitPrice`,
                              String(p.cost ?? 0),
                            );
                          }}
                          queryKey={['products']}
                          path="/products"
                          getOptionValue={(p) => p.id}
                          getOptionLabel={(p) => p.name}
                          selectedLabel={watchedItems[i]?.productName}
                          placeholder="Select product…"
                        />
                      )}
                    />
                  </td>
                  <td className="px-1" style={{ width: 120 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.unitPrice`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 90 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.quantity`)}
                    />
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
            <div className="space-y-1.5">
              <Label>Shipping</Label>
              <Input type="number" step="any" {...register('shipping')} />
            </div>
            <div className="space-y-1.5">
              <Label>Order tax %</Label>
              <Input type="number" step="any" {...register('orderTax')} />
            </div>
            <div className="space-y-1.5">
              <Label>Order discount</Label>
              <Input placeholder="0 or 5%" {...register('orderDiscount')} />
            </div>
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
          </div>
        </section>

        {/* ── Totals ── */}
        <section className="space-y-1 rounded-lg border p-4 text-sm">
          <Row label="Items" value={totals.totalItems} />
          <Row label="Total" value={totals.subtotal} money />
          <Row label="Product discount" value={totals.productDiscount} money />
          <Row label="Order discount" value={totals.orderDiscount} money />
          <Row label="Tax" value={totals.totalTax} money />
          <Row label="Shipping" value={totals.shipping} money />
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
