import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import { useBranchOptions } from '@/features/_shared/branches';
import { useBillers, useTaxRates } from '@/features/_shared/options';
import { computeOrder } from './totals';
import {
  useSale,
  useCreateSale,
  useUpdateSale,
} from '@/features/sales/api';
import {
  usePurchase,
  useCreatePurchase,
  useUpdatePurchase,
} from '@/features/purchases/api';

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const inputSm = 'h-9';

type Mode = 'sale' | 'purchase';

interface LineRow {
  productId: string;
  productName?: string;
  productCode?: string;
  optionId?: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
  taxRate: string;
  taxInclusive: boolean;
  hsnCode: string;
  batchNo: string;
  expiryDate: string;
  packSize: string;
  packQuantity: string;
  mrp: string;
  freePackQuantity: string;
}

interface FormValues {
  partyId: string;
  warehouseId: string;
  billerId: string;
  reference: string;
  date: string;
  status: string;
  orderDiscount: string;
  orderTax: string;
  shipping: string;
  paymentTerm: string;
  gstNumber: string;
  gstState: string;
  interState: boolean;
  note: string;
  staffNote: string;
  attachmentUrl: string;
  editNote: string;
  isBloodDonation: boolean;
  donorName: string;
  // Payment
  paymentStatus: string;
  paymentAmount: string;
  paidBy: string;
  chequeNo: string;
  ccNo: string;
  ccHolder: string;
  giftCardNo: string;
  items: LineRow[];
}

const EMPTY_ROW: LineRow = {
  productId: '',
  productName: '',
  productCode: '',
  optionId: '',
  quantity: '1',
  unitPrice: '0',
  discount: '0',
  taxRateId: '',
  taxRate: '0',
  taxInclusive: false,
  hsnCode: '',
  batchNo: '',
  expiryDate: '',
  packSize: '',
  packQuantity: '',
  mrp: '',
  freePackQuantity: '',
};

function defaults(): FormValues {
  return {
    partyId: '',
    warehouseId: '',
    billerId: '',
    reference: '',
    date: '',
    status: '',
    orderDiscount: '0',
    orderTax: '0',
    shipping: '0',
    paymentTerm: '',
    gstNumber: '',
    gstState: '',
    interState: false,
    note: '',
    staffNote: '',
    attachmentUrl: '',
    editNote: '',
    isBloodDonation: false,
    donorName: '',
    paymentStatus: 'due',
    paymentAmount: '0',
    paidBy: 'CASH',
    chequeNo: '',
    ccNo: '',
    ccHolder: '',
    giftCardNo: '',
    items: [{ ...EMPTY_ROW }],
  };
}

interface Props {
  mode: Mode;
  /** When set, edit this document instead of creating a new one. */
  editId?: string | null;
}

/**
 * Full-page order form — the EZHT add/edit Sale & Purchase screen. One component
 * drives both: sales pick a Customer + Biller and remove stock (COMPLETED);
 * purchases pick a Supplier and add stock (RECEIVED). Line grid, more-options,
 * live totals and a payment block mirror the legacy layout.
 */
export function OrderForm({ mode, editId }: Props) {
  const isSale = mode === 'sale';
  const navigate = useNavigate();
  const { data: branches } = useBranchOptions();
  const { data: billers } = useBillers();
  const { data: taxRates } = useTaxRates();

  const saleDetail = useSale(isSale ? (editId ?? null) : null);
  const purchaseDetail = usePurchase(!isSale ? (editId ?? null) : null);
  const editing = isSale ? saleDetail.data : purchaseDetail.data;

  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const saving =
    createSale.isPending ||
    updateSale.isPending ||
    createPurchase.isPending ||
    updatePurchase.isPending;

  const { register, handleSubmit, control, reset, setValue } =
    useForm<FormValues>({ defaultValues: defaults() });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Hydrate when editing.
  useEffect(() => {
    if (!editId || !editing) return;
    const d = editing as Record<string, unknown>;
    const party = isSale
      ? (d.customer as { id: string } | null)?.id
      : (d.supplier as { id: string } | null)?.id;
    reset({
      ...defaults(),
      partyId: party ?? '',
      warehouseId: (d.branchId as string) ?? '',
      billerId: (d.billerId as string) ?? '',
      reference: (d.reference as string) ?? '',
      date: d.date ? String(d.date).slice(0, 10) : '',
      status: (d.status as string) ?? '',
      orderDiscount: String(d.orderDiscountSpec ?? d.orderDiscount ?? 0),
      orderTax: String(d.orderTax ?? 0),
      shipping: String(d.shipping ?? 0),
      paymentTerm: d.paymentTerm != null ? String(d.paymentTerm) : '',
      gstNumber: (d.gstNumber as string) ?? '',
      gstState: (d.gstState as string) ?? '',
      interState: d.taxMethod === 'igst',
      note: (d.note as string) ?? '',
      staffNote: (d.staffNote as string) ?? '',
      attachmentUrl: (d.attachmentUrl as string) ?? '',
      isBloodDonation: Boolean(d.isBloodDonation),
      donorName: (d.donorName as string) ?? '',
      items: ((d.items as Record<string, unknown>[]) ?? []).map((i) => ({
        ...EMPTY_ROW,
        productId: String(i.productId ?? ''),
        productName: String(i.productName ?? ''),
        productCode: String(i.productCode ?? ''),
        optionId: String(i.optionId ?? ''),
        quantity: String(i.quantity ?? 1),
        unitPrice: String(isSale ? (i.price ?? 0) : (i.cost ?? 0)),
        discount: String(i.discountSpec ?? i.discount ?? 0),
        taxRate: String(i.taxRate ?? 0),
        taxInclusive: i.taxMethod === '1',
        hsnCode: String(i.hsnCode ?? ''),
        batchNo: String((isSale ? i.serialNo : i.batchNo) ?? ''),
        expiryDate: i.expiryDate ? String(i.expiryDate).slice(0, 10) : '',
        packSize: i.packSize != null ? String(i.packSize) : '',
        packQuantity: i.packQuantity != null ? String(i.packQuantity) : '',
        mrp: i.mrp != null ? String(i.mrp) : '',
        freePackQuantity:
          i.freePackQuantity != null ? String(i.freePackQuantity) : '',
      })),
    });
  }, [editId, editing, isSale, reset]);

  // useWatch re-renders reliably on nested field-array edits (plain watch() does
  // not), so the live per-line subtotals + order summary stay in sync.
  const live = useWatch({ control }) as Partial<FormValues>;
  const watchedItems = useMemo(() => live.items ?? [], [live.items]);
  const paymentStatus = live.paymentStatus ?? 'due';
  const paidBy = live.paidBy ?? 'CASH';

  const totals = useMemo(
    () =>
      computeOrder({
        lines: watchedItems.map((l) => ({
          quantity: Number(l.quantity || 0),
          unitPrice: Number(l.unitPrice || 0),
          discount: l.discount,
          taxRatePercent: Number(l.taxRate || 0),
          taxInclusive: l.taxInclusive,
        })),
        orderDiscount: live.orderDiscount,
        orderTaxPercent: Number(live.orderTax || 0),
        shipping: Number(live.shipping || 0),
        interState: live.interState,
      }),
    [watchedItems, live.orderDiscount, live.orderTax, live.shipping, live.interState],
  );

  const submit = handleSubmit(async (v) => {
    const items = v.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        optionId: i.optionId || undefined,
        quantity: Number(i.quantity || 0),
        [isSale ? 'price' : 'cost']: Number(i.unitPrice || 0),
        discount: i.discount || undefined,
        taxRate: Number(i.taxRate || 0),
        taxRateId: i.taxRateId || undefined,
        taxInclusive: i.taxInclusive || undefined,
        hsnCode: i.hsnCode || undefined,
        ...(isSale
          ? { serialNo: i.batchNo || undefined }
          : { batchNo: i.batchNo || undefined }),
        expiryDate: i.expiryDate || undefined,
        packSize: i.packSize ? Number(i.packSize) : undefined,
        packQuantity: i.packQuantity ? Number(i.packQuantity) : undefined,
        ...(isSale
          ? {}
          : {
              mrp: i.mrp ? Number(i.mrp) : undefined,
              freePackQuantity: i.freePackQuantity
                ? Number(i.freePackQuantity)
                : undefined,
            }),
      }));

    if (items.length === 0) {
      toast.error('Add at least one product line.');
      return;
    }

    const payment =
      v.paymentStatus && v.paymentStatus !== 'due'
        ? {
            paymentStatus: v.paymentStatus,
            amount: Number(v.paymentAmount || 0),
            paidBy: v.paidBy,
            chequeNo: v.chequeNo || undefined,
            ccNo: v.ccNo || undefined,
            ccHolder: v.ccHolder || undefined,
            giftCardNo: v.giftCardNo || undefined,
          }
        : undefined;

    const common = {
      warehouseId: v.warehouseId || undefined,
      reference: v.reference || undefined,
      date: v.date || undefined,
      status: v.status || undefined,
      orderDiscount: v.orderDiscount || undefined,
      orderTax: Number(v.orderTax || 0),
      shipping: Number(v.shipping || 0),
      paymentTerm: v.paymentTerm ? Number(v.paymentTerm) : undefined,
      gstNumber: v.gstNumber || undefined,
      gstState: v.gstState || undefined,
      interState: v.interState || undefined,
      note: v.note || undefined,
      attachmentUrl: v.attachmentUrl || undefined,
      items,
      payment,
    };

    try {
      if (isSale) {
        const body = {
          ...common,
          customerId: v.partyId,
          billerId: v.billerId || undefined,
          staffNote: v.staffNote || undefined,
        };
        if (editId) await updateSale.mutateAsync({ id: editId, input: body });
        else await createSale.mutateAsync(body);
        toast.success(editId ? 'Sale updated' : 'Sale created');
        navigate('/sales');
      } else {
        const body = {
          ...common,
          supplierId: v.partyId,
          editNote: editId ? v.editNote || undefined : undefined,
          isBloodDonation: v.isBloodDonation || undefined,
          donorName: v.isBloodDonation ? v.donorName || undefined : undefined,
        };
        if (editId)
          await updatePurchase.mutateAsync({ id: editId, input: body });
        else await createPurchase.mutateAsync(body);
        toast.success(editId ? 'Purchase updated' : 'Purchase created');
        navigate('/purchases');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save'));
    }
  });

  const statusOptions = isSale
    ? [
        { v: 'COMPLETED', l: 'Completed (removes stock)' },
        { v: 'PENDING', l: 'Pending' },
      ]
    : [
        { v: 'RECEIVED', l: 'Received (adds stock)' },
        { v: 'ORDERED', l: 'Ordered' },
        { v: 'PENDING', l: 'Pending' },
      ];

  const paidByOptions = isSale
    ? ['CASH', 'CARD', 'CHEQUE', 'GIFT_CARD', 'BANK_TRANSFER']
    : ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER'];

  const priceLabel = isSale ? 'Unit price' : 'Unit cost';

  return (
    <form onSubmit={submit} className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(isSale ? '/sales' : '/purchases')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">
            {editId ? 'Edit' : 'Add'} {isSale ? 'Sale' : 'Purchase'}
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
          <Label>Warehouse</Label>
          <select className={selectCls} {...register('warehouseId')}>
            <option value="">Active branch</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{isSale ? 'Customer' : 'Supplier'}</Label>
          <Controller
            control={control}
            name="partyId"
            rules={{ required: true }}
            render={({ field }) => (
              <InfiniteSelect
                value={field.value}
                onChange={field.onChange}
                queryKey={[isSale ? 'customers' : 'suppliers']}
                path={isSale ? '/customers' : '/suppliers'}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => c.name}
                selectedLabel={
                  isSale
                    ? (editing as { customer?: { name?: string } })?.customer
                        ?.name
                    : (editing as { supplier?: { name?: string } })?.supplier
                        ?.name
                }
                placeholder={`Select ${isSale ? 'customer' : 'supplier'}…`}
              />
            )}
          />
        </div>
        {isSale && (
          <div className="space-y-1.5">
            <Label>Biller</Label>
            <select className={selectCls} {...register('billerId')}>
              <option value="">— none —</option>
              {(billers ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select className={selectCls} {...register('status')}>
            {statusOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
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
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Product</th>
                <th className="px-1">Batch</th>
                <th className="px-1">Expiry</th>
                {!isSale && <th className="px-1">MRP</th>}
                <th className="px-1">Qty</th>
                <th className="px-1">{priceLabel}</th>
                <th className="px-1">Disc</th>
                <th className="px-1">Tax</th>
                <th className="px-1">HSN</th>
                <th className="px-1 text-right">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
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
                            setValue(
                              `items.${i}.unitPrice`,
                              String(isSale ? (p.price ?? 0) : (p.cost ?? 0)),
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
                  <td className="px-1">
                    <Input className={inputSm} {...register(`items.${i}.batchNo`)} />
                  </td>
                  <td className="px-1">
                    <Input
                      type="date"
                      className={inputSm}
                      {...register(`items.${i}.expiryDate`)}
                    />
                  </td>
                  {!isSale && (
                    <td className="px-1" style={{ width: 90 }}>
                      <Input
                        type="number"
                        step="any"
                        className={inputSm}
                        {...register(`items.${i}.mrp`)}
                      />
                    </td>
                  )}
                  <td className="px-1" style={{ width: 80 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.quantity`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 100 }}>
                    <Input
                      type="number"
                      step="any"
                      className={inputSm}
                      {...register(`items.${i}.unitPrice`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 80 }}>
                    <Input
                      className={inputSm}
                      placeholder="0 or 5%"
                      {...register(`items.${i}.discount`)}
                    />
                  </td>
                  <td className="px-1" style={{ width: 130 }}>
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
                  <td className="px-1" style={{ width: 90 }}>
                    <Input className={inputSm} {...register(`items.${i}.hsnCode`)} />
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
            <div className="space-y-1.5">
              <Label>Payment term (days)</Label>
              <Input type="number" {...register('paymentTerm')} />
            </div>
            <div className="space-y-1.5">
              <Label>GST number</Label>
              <Input {...register('gstNumber')} />
            </div>
            <div className="space-y-1.5">
              <Label>GST state</Label>
              <Input {...register('gstState')} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('interState')} />
              Inter-state (IGST); unchecked = CGST + SGST
            </label>
            <div className="col-span-2 space-y-1.5">
              <Label>Attachment URL</Label>
              <Input placeholder="https://…" {...register('attachmentUrl')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Note</Label>
              <Input {...register('note')} />
            </div>
            {isSale && (
              <div className="col-span-2 space-y-1.5">
                <Label>Staff note (internal)</Label>
                <Input {...register('staffNote')} />
              </div>
            )}
            {!isSale && editId && (
              <div className="col-span-2 space-y-1.5">
                <Label>Edit note (audit)</Label>
                <Input {...register('editNote')} />
              </div>
            )}
            {!isSale && (
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('isBloodDonation')} />
                Blood-donation receipt
              </label>
            )}
            {!isSale && live.isBloodDonation && (
              <div className="col-span-2 space-y-1.5">
                <Label>Donor name</Label>
                <Input {...register('donorName')} />
              </div>
            )}
          </div>
        </section>

        {/* ── Totals + payment ── */}
        <section className="space-y-4">
          <div className="space-y-1 rounded-lg border p-4 text-sm">
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
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <Label className="text-base">Payment</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment status</Label>
                <select className={selectCls} {...register('paymentStatus')}>
                  <option value="due">Due</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              {paymentStatus === 'partial' && (
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input type="number" step="any" {...register('paymentAmount')} />
                </div>
              )}
              {paymentStatus !== 'due' && (
                <div className="space-y-1.5">
                  <Label>Paid by</Label>
                  <select className={selectCls} {...register('paidBy')}>
                    {paidByOptions.map((m) => (
                      <option key={m} value={m}>
                        {m.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {paymentStatus !== 'due' && paidBy === 'CHEQUE' && (
                <div className="space-y-1.5">
                  <Label>Cheque no</Label>
                  <Input {...register('chequeNo')} />
                </div>
              )}
              {paymentStatus !== 'due' && paidBy === 'CARD' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Card no</Label>
                    <Input {...register('ccNo')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Card holder</Label>
                    <Input {...register('ccHolder')} />
                  </div>
                </>
              )}
              {paymentStatus !== 'due' &&
                paidBy === 'GIFT_CARD' &&
                isSale && (
                  <div className="space-y-1.5">
                    <Label>Gift card no</Label>
                    <Input {...register('giftCardNo')} />
                  </div>
                )}
            </div>
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
