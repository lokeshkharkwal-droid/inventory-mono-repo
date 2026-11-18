import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import { useTaxRates } from '@/features/_shared/options';
import { computeOrder } from '@/features/orders/totals';
import { useCreateProforma, useUpdateProforma, type ProformaDetail } from './api';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const inputSm = 'h-9';

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  quantity: string;
  quantityMethod: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
  taxRate: string;
}
interface LabRow {
  name: string;
  price: string;
  type: string;
}

interface FormValues {
  name: string;
  customerId: string;
  reference: string;
  date: string;
  status: string;
  orderDiscount: string;
  orderTax: string;
  shipping: string;
  note: string;
  items: LineRow[];
  labTests: LabRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  quantity: '1',
  quantityMethod: '1',
  unitPrice: '0',
  discount: '0',
  taxRateId: '',
  taxRate: '0',
};

function defaults(): FormValues {
  return {
    name: '',
    customerId: '',
    reference: '',
    date: '',
    status: 'ACTIVE',
    orderDiscount: '0',
    orderTax: '0',
    shipping: '0',
    note: '',
    items: [{ ...EMPTY_ROW }],
    labTests: [],
  };
}

/** Map a loaded proforma (edit mode) into the form's string-based shape. */
export function toFormValues(p: ProformaDetail): FormValues {
  return {
    name: p.name ?? '',
    customerId: '',
    reference: p.reference,
    date: p.date ? new Date(p.date).toISOString().slice(0, 10) : '',
    status: p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    orderDiscount: '0',
    orderTax: '0',
    shipping: '0',
    note: p.note ?? '',
    items: (p.items ?? []).map((it) => ({
      productId: it.productId,
      productName: it.productName,
      productCode: it.productCode ?? '',
      quantity: String(Number(it.quantity)),
      quantityMethod: String(it.quantityMethod ?? 1),
      unitPrice: String(Number(it.unitPrice)),
      discount: String(Number(it.discount ?? 0)),
      taxRateId: '',
      taxRate: String(Number(it.taxRate ?? 0)),
    })),
    labTests: [],
  };
}

interface Props {
  /** Called after a successful save or on cancel. */
  onDone: () => void;
  /** When set, the form edits this proforma (EZHT `proformas/edit`) instead of creating. */
  proformaId?: string;
  /** Prefill values (edit mode). */
  initialValues?: FormValues;
}

/**
 * Proforma form — EZ Health Track `proformas/add` / `proformas/edit` parity. A named
 * proforma (title + status) over a full order-items table: product search-to-add rows
 * with net unit price, quantity, quantity method (Single/Combined), discount, tax and a
 * live per-line subtotal, plus a running totals summary and optional clinical
 * (lab/radiology/blood) lines. In edit mode (`proformaId`) it updates in place.
 */
export function ProformaForm({ onDone, proformaId, initialValues }: Props) {
  const isEdit = Boolean(proformaId);
  const create = useCreateProforma();
  const update = useUpdateProforma(proformaId ?? '');
  const mutation = isEdit ? update : create;
  const { data: taxRates } = useTaxRates();

  const { register, handleSubmit, control, reset, setValue } = useForm<FormValues>({
    defaultValues: initialValues ?? defaults(),
  });

  // Edit mode: once tax rates load, resolve each line's `taxRateId` from its rate
  // so the tax dropdown reflects the saved tax (the subtotal already uses `taxRate`).
  useEffect(() => {
    if (!isEdit || !taxRates?.length || !initialValues) return;
    initialValues.items.forEach((it, i) => {
      const rate = Number(it.taxRate || 0);
      if (rate > 0) {
        const match = taxRates.find((t) => Number(t.rate) === rate);
        if (match) setValue(`items.${i}.taxRateId`, match.id);
      }
    });
  }, [isEdit, taxRates, initialValues, setValue]);
  const items = useFieldArray({ control, name: 'items' });
  const labs = useFieldArray({ control, name: 'labTests' });

  // useWatch re-renders reliably on nested field-array edits (plain watch() does
  // not), so the per-line subtotals and the totals summary stay in sync.
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
    const productItems = v.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity || 0),
        quantityMethod: Number(i.quantityMethod || 1),
        unitPrice: Number(i.unitPrice || 0),
        taxRate: Number(i.taxRate || 0),
        discount: Number(i.discount || 0),
      }));
    if (productItems.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    const labTests = v.labTests
      .filter((l) => l.name)
      .map((l) => ({
        name: l.name,
        price: Number(l.price || 0),
        type: l.type || 'LAB_TEST',
      }));
    const payload = {
      name: v.name,
      customerId: v.customerId || undefined,
      status: v.status || undefined,
      reference: v.reference || undefined,
      date: v.date || undefined,
      orderDiscount: Number(v.orderDiscount || 0) || undefined,
      shipping: Number(v.shipping || 0) || undefined,
      note: v.note || undefined,
      items: productItems,
      labTests: labTests.length ? labTests : undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync(payload);
        toast.success('Proforma updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Proforma created');
        reset(defaults());
      }
      onDone();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isEdit ? 'Could not update proforma' : 'Could not create proforma',
        ),
      );
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* ── Header ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Proforma name"
            {...register('name', { required: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select id="status" className={selectCls} {...register('status')}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customerId">Customer</Label>
          <Controller
            control={control}
            name="customerId"
            render={({ field }) => (
              <InfiniteSelect
                id="customerId"
                value={field.value}
                onChange={field.onChange}
                queryKey={['customers']}
                path="/customers"
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => c.name}
                placeholder="Select customer…"
                clearable
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" placeholder="Auto if blank" {...register('reference')} />
        </div>
      </div>

      {/* ── Order items ── */}
      <section className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Order items *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => items.append({ ...EMPTY_ROW })}
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Product (code)</th>
                <th className="px-1">Net unit price</th>
                <th className="px-1">Qty</th>
                <th className="px-1">Qty method</th>
                <th className="px-1">Discount</th>
                <th className="px-1">Product tax</th>
                <th className="px-1 text-right">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.fields.map((f, i) => (
                <tr key={f.id} className="border-b align-top">
                  <td className="py-2 pr-2" style={{ minWidth: 200 }}>
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
                            setValue(`items.${i}.unitPrice`, String(p.price ?? 0));
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
                    {watchedItems[i]?.productCode ? (
                      <span className="text-xs text-muted-foreground">
                        {watchedItems[i]?.productCode}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-1" style={{ width: 110 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.unitPrice`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 80 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.quantity`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 120 }}>
                    <select
                      className={`${selectCls} h-9`}
                      {...register(`items.${i}.quantityMethod`)}
                    >
                      <option value="1">Single</option>
                      <option value="2">Combined</option>
                    </select>
                  </td>
                  <td className="px-1" style={{ width: 90 }}>
                    <Input
                      className={inputSm}
                      placeholder="0 or 5%"
                      {...register(`items.${i}.discount`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 140 }}>
                    <select
                      className={`${selectCls} h-9`}
                      value={watchedItems[i]?.taxRateId ?? ''}
                      onChange={(e) => {
                        const tr = (taxRates ?? []).find(
                          (t) => t.id === e.target.value,
                        );
                        setValue(`items.${i}.taxRateId`, e.target.value);
                        setValue(`items.${i}.taxRate`, tr ? String(tr.rate) : '0');
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
                      onClick={() => items.remove(i)}
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

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── More options ── */}
        <section className="space-y-3 rounded-lg border p-4">
          <Label className="text-base">More options</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Order discount</Label>
              <Input placeholder="0 or 5%" {...register('orderDiscount')} />
            </div>
            <div className="space-y-1.5">
              <Label>Order tax %</Label>
              <Input type="number" step="any" {...register('orderTax')} />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping</Label>
              <Input type="number" step="any" {...register('shipping')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <Input id="note" {...register('note')} />
            </div>
          </div>

          {/* ── Clinical lines (lab / radiology / blood) ── */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>Clinical lines — lab / radiology / blood (optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => labs.append({ name: '', price: '0', type: 'LAB_TEST' })}
              >
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
            {labs.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[2fr_1.3fr_1fr_auto] gap-2">
                <Input placeholder="Name" {...register(`labTests.${i}.name`)} />
                <select className={selectCls} {...register(`labTests.${i}.type`)}>
                  <option value="LAB_TEST">Lab test</option>
                  <option value="RADIOLOGY">Radiology</option>
                  <option value="BLOOD_DONATION">Blood donation</option>
                  <option value="BLOOD_REQUEST">Blood request</option>
                </select>
                <Input
                  placeholder="Price"
                  type="number"
                  step="any"
                  {...register(`labTests.${i}.price`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => labs.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
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

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Saving…'
            : isEdit
              ? 'Update'
              : 'Save'}
        </Button>
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
