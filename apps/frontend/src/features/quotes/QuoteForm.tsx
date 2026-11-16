import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { getApiErrorMessage } from '@/lib/http';
import { useBranchOptions } from '@/features/_shared/branches';
import { useBillers, useTaxRates } from '@/features/_shared/options';
import { computeOrder } from '@/features/orders/totals';
import { useCreateQuote } from './api';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const inputSm = 'h-9';

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  unitPrice: string;
  packSize: string;
  packQuantity: string;
  quantity: string;
  discount: string;
  taxRateId: string;
  taxRate: string;
}

interface FormValues {
  type: 'SALE' | 'PURCHASE';
  customerId: string;
  supplierId: string;
  billerId: string;
  warehouseId: string;
  status: string;
  reference: string;
  date: string;
  // Referral (SALE only)
  referralEnabled: boolean;
  referralSourceType: string;
  referralFirstName: string;
  referralMiddleName: string;
  referralLastName: string;
  referralBusinessName: string;
  referralBusinessAddress: string;
  // More options
  orderDiscount: string;
  orderTax: string;
  shipping: string;
  gstNumber: string;
  note: string;
  attachmentUrl: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  unitPrice: '0',
  packSize: '',
  packQuantity: '',
  quantity: '1',
  discount: '0',
  taxRateId: '',
  taxRate: '0',
};

function defaults(type: 'SALE' | 'PURCHASE'): FormValues {
  return {
    type,
    customerId: '',
    supplierId: '',
    billerId: '',
    warehouseId: '',
    status: 'DRAFT',
    reference: '',
    date: '',
    referralEnabled: false,
    referralSourceType: 'DOCTOR',
    referralFirstName: '',
    referralMiddleName: '',
    referralLastName: '',
    referralBusinessName: '',
    referralBusinessAddress: '',
    orderDiscount: '0',
    orderTax: '0',
    shipping: '0',
    gstNumber: '',
    note: '',
    attachmentUrl: '',
    items: [{ ...EMPTY_ROW }],
  };
}

interface Props {
  /** Pre-selected quote type (sales vs purchase). */
  defaultType?: 'SALE' | 'PURCHASE';
  /** Called after a successful save or on cancel. */
  onDone: () => void;
}

/**
 * Create-quote form (sales or purchase) — EZ Health Track `quotes/add` parity.
 * A full order-items table (product search-to-add rows with net unit price,
 * pack size/quantity, quantity, discount, per-line tax and a live subtotal),
 * header fields (date, party, reference, biller, warehouse, status), an
 * optional referral panel (SALE only), a footer "more options" block and a
 * live totals summary. Shared by {@link QuoteFormDialog} and the dedicated
 * `/quotes/add` page.
 */
export function QuoteForm({ defaultType = 'SALE', onDone }: Props) {
  const create = useCreateQuote();
  const { data: branches } = useBranchOptions();
  const { data: billers } = useBillers();
  const { data: taxRates } = useTaxRates();
  const [type, setType] = useState<'SALE' | 'PURCHASE'>(defaultType);

  const { register, handleSubmit, control, reset, setValue } = useForm<FormValues>({
    defaultValues: defaults(defaultType),
  });
  const items = useFieldArray({ control, name: 'items' });

  // useWatch re-renders reliably on nested field-array edits (plain watch() does
  // not), so the per-line subtotals and the totals summary stay in sync.
  const live = useWatch({ control }) as Partial<FormValues>;
  const watchedItems = useMemo(() => live.items ?? [], [live.items]);
  const referralEnabled = Boolean(live.referralEnabled);

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
        unitPrice: Number(i.unitPrice || 0),
        taxRate: Number(i.taxRate || 0),
        discount: Number(i.discount || 0),
        packSize: i.packSize ? Number(i.packSize) : undefined,
        packQuantity: i.packQuantity ? Number(i.packQuantity) : undefined,
      }));
    if (productItems.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }
    if (v.type === 'SALE' && !v.customerId) {
      toast.error('Select a patient.');
      return;
    }
    if (v.type === 'PURCHASE' && !v.supplierId) {
      toast.error('Select a supplier.');
      return;
    }

    const referral =
      v.type === 'SALE' && v.referralEnabled
        ? {
            sourceType: v.referralSourceType || undefined,
            contactFname: v.referralFirstName || undefined,
            contactMname: v.referralMiddleName || undefined,
            contactLname: v.referralLastName || undefined,
            businessName: v.referralBusinessName || undefined,
            businessAddress: v.referralBusinessAddress || undefined,
          }
        : undefined;

    try {
      await create.mutateAsync({
        type: v.type,
        customerId: v.type === 'SALE' ? v.customerId : undefined,
        supplierId: v.type === 'PURCHASE' ? v.supplierId : undefined,
        billerId: v.billerId || undefined,
        warehouseId: v.warehouseId || undefined,
        status: v.status || undefined,
        reference: v.reference || undefined,
        date: v.date || undefined,
        gstNumber: v.gstNumber || undefined,
        attachmentUrl: v.attachmentUrl || undefined,
        referral,
        orderDiscount: Number(v.orderDiscount || 0) || undefined,
        orderTax: Number(v.orderTax || 0) || undefined,
        shipping: Number(v.shipping || 0) || undefined,
        note: v.note || undefined,
        items: productItems,
      });
      toast.success('Quote created');
      reset(defaults(type));
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create quote'));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* ── Header ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className={selectCls}
            {...register('type', {
              onChange: (e) => setType(e.target.value as 'SALE' | 'PURCHASE'),
            })}
          >
            <option value="SALE">SALE</option>
            <option value="PURCHASE">PURCHASE</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register('date')} />
        </div>
        {type === 'SALE' ? (
          <div className="space-y-1.5">
            <Label htmlFor="customerId">Patient</Label>
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
                  placeholder="Select patient…"
                  clearable
                />
              )}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="supplierId">Supplier</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <InfiniteSelect
                  id="supplierId"
                  value={field.value}
                  onChange={field.onChange}
                  queryKey={['suppliers']}
                  path="/suppliers"
                  getOptionValue={(s) => s.id}
                  getOptionLabel={(s) => s.name}
                  placeholder="Select supplier…"
                  clearable
                />
              )}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" placeholder="Auto if blank" {...register('reference')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="billerId">Biller</Label>
          <select id="billerId" className={selectCls} {...register('billerId')}>
            <option value="">— none —</option>
            {(billers ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="warehouseId">Warehouse</Label>
          <select id="warehouseId" className={selectCls} {...register('warehouseId')}>
            <option value="">Active branch</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select id="status" className={selectCls} {...register('status')}>
            <option value="DRAFT">Pending</option>
            <option value="SENT">Sent</option>
          </select>
        </div>
      </div>

      {/* ── Referral (SALE only) ── */}
      {type === 'SALE' && (
        <section className="space-y-3 rounded-lg border p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" {...register('referralEnabled')} />
            Referral
          </label>
          {referralEnabled && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="referralSourceType">Source Type</Label>
                <select
                  id="referralSourceType"
                  className={selectCls}
                  {...register('referralSourceType')}
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="AGENCY">Agency</option>
                  <option value="HOSPITAL">Hospital</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referralFirstName">First Name</Label>
                <Input id="referralFirstName" {...register('referralFirstName')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referralMiddleName">Middle Name</Label>
                <Input id="referralMiddleName" {...register('referralMiddleName')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referralLastName">Last Name</Label>
                <Input id="referralLastName" {...register('referralLastName')} />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="referralBusinessName">Business Name</Label>
                <Input
                  id="referralBusinessName"
                  {...register('referralBusinessName')}
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="referralBusinessAddress">Business Address</Label>
                <Input
                  id="referralBusinessAddress"
                  {...register('referralBusinessAddress')}
                />
              </div>
            </div>
          )}
        </section>
      )}

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
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Product Name (Product Code)</th>
                <th className="px-1">Net Unit Price</th>
                <th className="px-1">Pack Size</th>
                <th className="px-1">Pack Quantity</th>
                <th className="px-1">Quantity</th>
                <th className="px-1">Discount</th>
                <th className="px-1">Product Tax</th>
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
                  <td className="px-1" style={{ width: 100 }}>
                    <Input
                      className={inputSm}
                      {...register(`items.${i}.packSize`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 110 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.packQuantity`)}
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
              <Label>Order Discount</Label>
              <Input placeholder="0 or 5%" {...register('orderDiscount')} />
            </div>
            <div className="space-y-1.5">
              <Label>Order Tax %</Label>
              <Input type="number" step="any" {...register('orderTax')} />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping</Label>
              <Input type="number" step="any" {...register('shipping')} />
            </div>
            <div className="space-y-1.5">
              <Label>GST No</Label>
              <Input {...register('gstNumber')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <Input id="note" {...register('note')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="attachmentUrl">Document</Label>
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
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Save'}
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
