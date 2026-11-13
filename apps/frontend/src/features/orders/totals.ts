/**
 * Client-side mirror of the backend `computeOrderTotals` money engine
 * (common/utils/order-totals.util.ts) so the Add/Edit forms can show live
 * per-line subtotals and an order summary that matches what the server stores.
 * Kept deliberately in step with the backend; the server remains authoritative.
 */

export interface OrderLineValues {
  quantity: number;
  unitPrice: number;
  /** Discount spec: a flat amount or a percentage like "10%". */
  discount?: string;
  taxRatePercent?: number;
  taxInclusive?: boolean;
}

export interface OrderValues {
  lines: OrderLineValues[];
  orderDiscount?: string;
  orderTaxPercent?: number;
  shipping?: number;
  interState?: boolean;
}

export interface LineTotals {
  netUnitPrice: number;
  taxAmount: number;
  discount: number;
  subtotal: number;
}

export interface OrderTotals {
  lines: LineTotals[];
  subtotal: number;
  productTax: number;
  productDiscount: number;
  orderDiscount: number;
  orderTax: number;
  totalTax: number;
  shipping: number;
  grandTotal: number;
  totalItems: number;
}

function resolveSpec(spec: string | number | undefined, base: number): number {
  if (spec == null || spec === '') return 0;
  const str = String(spec).trim();
  if (str.endsWith('%')) {
    const pct = Number(str.slice(0, -1));
    return Number.isFinite(pct) ? (base * pct) / 100 : 0;
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

/** Compute a line's net unit price, tax, discount and subtotal. */
export function computeLine(l: OrderLineValues): LineTotals {
  const qty = Number(l.quantity) || 0;
  const unitPrice = Number(l.unitPrice) || 0;
  const taxRate = Number(l.taxRatePercent) || 0;
  const discountPerUnit = resolveSpec(l.discount, unitPrice);
  const afterDiscount = unitPrice - discountPerUnit;

  let netUnitPrice: number;
  let unitTax: number;
  if (l.taxInclusive) {
    unitTax = taxRate > 0 ? (afterDiscount * taxRate) / (100 + taxRate) : 0;
    netUnitPrice = afterDiscount - unitTax;
  } else {
    netUnitPrice = afterDiscount;
    unitTax = (netUnitPrice * taxRate) / 100;
  }
  const taxAmount = unitTax * qty;
  return {
    netUnitPrice,
    taxAmount,
    discount: discountPerUnit * qty,
    subtotal: netUnitPrice * qty + taxAmount,
  };
}

/** Compute the full order summary from the current form values. */
export function computeOrder(v: OrderValues): OrderTotals {
  const lines = v.lines.map(computeLine);
  const productBase = v.lines.reduce(
    (s, l, i) => s + lines[i]!.netUnitPrice * (Number(l.quantity) || 0),
    0,
  );
  const productTax = lines.reduce((s, l) => s + l.taxAmount, 0);
  const productDiscount = lines.reduce((s, l) => s + l.discount, 0);
  const totalItems = v.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  const orderDiscount = resolveSpec(v.orderDiscount, productBase + productTax);
  const afterOrderDiscount = productBase + productTax - orderDiscount;
  const orderTaxPct = Number(v.orderTaxPercent) || 0;
  const orderTax = orderTaxPct > 0 ? (afterOrderDiscount * orderTaxPct) / 100 : 0;
  const shipping = Number(v.shipping) || 0;
  const totalTax = productTax + orderTax;
  const grandTotal = productBase + productTax + orderTax + shipping - orderDiscount;

  return {
    lines,
    subtotal: productBase,
    productTax,
    productDiscount,
    orderDiscount,
    orderTax,
    totalTax,
    shipping,
    grandTotal,
    totalItems,
  };
}
